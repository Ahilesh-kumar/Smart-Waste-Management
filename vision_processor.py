"""
Vision Processor for Waste Management System
--------------------------------------------
1. Captures video from Phone (IP Webcam).
2. Runs Teachable Machine Model (Keras/TensorFlow).
3. Sends Classification (0,1,2,3) to Node.js Backend via Socket.io.
"""

import os
# Force Legacy Keras (crucial for Teachable Machine models in TF 2.16+)
os.environ["TF_USE_LEGACY_KERAS"] = "1"

import cv2
import numpy as np
import socketio
import tensorflow as tf
from tensorflow.keras.models import load_model

# CONFIG
IP_CAM_URL = "http://192.168.1.3:8080/video" # <--- UPDATE THIS
BACKEND_URL = "http://localhost:3001"
MODEL_PATH = "keras_model.h5" # Exported from Teachable Machine
LABELS_PATH = "labels.txt"

# 1. Connect to Backend
sio = socketio.Client()

@sio.event
def connect():
    print("Connected to Backend Server")

@sio.event
def disconnect():
    print("Disconnected from Server")

try:
    sio.connect(BACKEND_URL)
except Exception as e:
    print(f"Could not connect to backend: {e}")

# 2. Load Model
# Disable scientific notation for clarity
np.set_printoptions(suppress=True)

# Patch for Teachable Machine models in newer TensorFlow versions
# The 'groups' argument causes an error in DepthwiseConv2D
from tensorflow.keras.layers import DepthwiseConv2D
class CustomDepthwiseConv2D(DepthwiseConv2D):
    def __init__(self, **kwargs):
        kwargs.pop('groups', None)  # Remove 'groups' if present
        super().__init__(**kwargs)

# Load the model with the custom layer
model = load_model(MODEL_PATH, custom_objects={'DepthwiseConv2D': CustomDepthwiseConv2D}, compile=False)
class_names = open(LABELS_PATH, "r").readlines()

# 3. Start Video Capture
# 3. Threaded Video Capture
import time
import threading
from collections import deque, Counter

class VideoStream:
    """Reading frames in a separate thread to prevent I/O blocking"""
    def __init__(self, src=0):
        self.stream = cv2.VideoCapture(src)
        if not self.stream.isOpened():
            print("❌ ERROR: Could not open camera stream!")
            self.stop()
            exit()
        (self.grabbed, self.frame) = self.stream.read()
        self.stopped = False

    def start(self):
        threading.Thread(target=self.update, args=()).start()
        return self

    def update(self):
        while not self.stopped:
            if not self.stream.isOpened():
                self.stop()
                return
            (self.grabbed, self.frame) = self.stream.read()

    def read(self):
        return self.frame

    def stop(self):
        self.stopped = True
        self.stream.release()

last_sorted_time = 0
frame_count = 0
AI_INTERVAL = 5 # Run AI more frequently (every 5 frames) due to threading speedup
prediction_history = deque(maxlen=3) 
last_emit_time = 0 

# Caching for frames between AI runs
cached_class = "Scanning..."
cached_conf = 0.0
cached_label_id = -1

# Box Smoothing
prev_box = None
SMOOTHING_FACTOR = 0.5 

print(f"Connecting to Camera at: {IP_CAM_URL} ...")
vs = VideoStream(IP_CAM_URL).start()
print("✅ Camera Connected! Starting Video Feed...")
time.sleep(2.0) # Warmup

# Centroid Tracking for Motion Detection
last_centroid = None
frames_stationary = 0
IS_MOVING = False
STATIONARY_THRESHOLD = 5 # Frames to wait before declaring stationary
MOVEMENT_THRESHOLD = 2.0 # Pixels (in % or relative units) to consider "moving"

# ===== WEIGHT ESTIMATION CONFIG =====
# Category-based density factors (grams per pixel² area)
# These are calibrated estimates based on typical waste item sizes
WEIGHT_DENSITY_FACTORS = {
    'bio': 0.025,      # Bio-medical (gloves, masks) - light
    'hazard': 0.08,    # Hazardous (batteries, chemicals) - heavy
    'haz': 0.08,       # Alternative name
    'dry': 0.015,      # Dry recyclables (paper, plastic) - very light
    'rec': 0.015,      # Recyclables
    'wet': 0.05,       # Wet organic waste - medium density
    'org': 0.05,       # Organics
    'met': 0.12,       # Metal items - very heavy
    'e-waste': 0.10,   # Electronics - heavy
    'default': 0.03    # Unknown items
}

# Reference frame area (assumes 640x480 camera resolution scaled)
REFERENCE_AREA = 640 * 480 * 0.4 * 0.4  # Scaled frame size
MIN_WEIGHT = 1.0    # Minimum weight in grams
MAX_WEIGHT = 500.0  # Maximum weight cap in grams

def estimate_weight(class_name: str, box_width_pct: float, box_height_pct: float) -> float:
    """
    Estimate object weight based on bounding box size and category density.
    
    Args:
        class_name: Detected class name (e.g., 'bio medical', 'hazardous')
        box_width_pct: Bounding box width as percentage of frame (0-100)
        box_height_pct: Bounding box height as percentage of frame (0-100)
    
    Returns:
        Estimated weight in grams (capped between MIN_WEIGHT and MAX_WEIGHT)
    """
    # Calculate approximate pixel area from percentages
    pixel_width = (box_width_pct / 100) * 640 * 0.4  # Scaled width
    pixel_height = (box_height_pct / 100) * 480 * 0.4  # Scaled height
    area = pixel_width * pixel_height
    
    # Find the appropriate density factor based on class name
    class_lower = class_name.lower()
    density = WEIGHT_DENSITY_FACTORS.get('default')
    
    for key, factor in WEIGHT_DENSITY_FACTORS.items():
        if key in class_lower:
            density = factor
            break
    
    # Calculate weight = area * density
    raw_weight = area * density
    
    # Apply min/max caps and round to 1 decimal place
    estimated_weight = max(MIN_WEIGHT, min(MAX_WEIGHT, raw_weight))
    return round(estimated_weight, 1)

# Track estimated weight for emission
cached_weight = 0.0

while True:
    frame = vs.read()
    if frame is None:
        break

    # Show the Feed (Optional - comment out for speed)
    cv2.imshow("Waste Classifier", frame)
    frame_count += 1
    
    # --- 1. FAST OBJECT TRACKING (Run EVERY Frame) ---
    small_frame = cv2.resize(frame, (0, 0), fx=0.4, fy=0.4) 
    height, width, _ = small_frame.shape
    
    # Define Detection Zone
    margin_x = int(width * 0.2)
    margin_y = int(height * 0.2)
    roi = small_frame[margin_y:height-margin_y, margin_x:width-margin_x]
    
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    box_data = None
    object_present = False
    
    if contours:
        largest_contour = max(contours, key=cv2.contourArea)
        if cv2.contourArea(largest_contour) > 1500:
            object_present = True
            x, y, w, h = cv2.boundingRect(largest_contour)
            
            # Centroid Calculation (Relative to ROI)
            cx = x + w / 2
            cy = y + h / 2
            
            # Check Motion
            if last_centroid:
                # Euclidean distance
                dist = np.sqrt((cx - last_centroid[0])**2 + (cy - last_centroid[1])**2)
                if dist > MOVEMENT_THRESHOLD:
                    frames_stationary = 0
                    IS_MOVING = True
                    cached_class = "Moving..." # Generic label
                    cached_conf = 0.0
                else:
                    frames_stationary += 1
                    if frames_stationary > STATIONARY_THRESHOLD:
                        IS_MOVING = False
            
            last_centroid = (cx, cy)

            # Offset coordinates
            x += margin_x
            y += margin_y
            
            # Convert to percentage
            pct_x = (x / width) * 100
            pct_y = (y / height) * 100
            pct_w = (w / width) * 100
            pct_h = (h / height) * 100
            
            new_box = {'x': pct_x, 'y': pct_y, 'w': pct_w, 'h': pct_h}
            
            if prev_box:
                box_data = {
                    'x': prev_box['x'] * SMOOTHING_FACTOR + new_box['x'] * (1 - SMOOTHING_FACTOR),
                    'y': prev_box['y'] * SMOOTHING_FACTOR + new_box['y'] * (1 - SMOOTHING_FACTOR),
                    'w': prev_box['w'] * SMOOTHING_FACTOR + new_box['w'] * (1 - SMOOTHING_FACTOR),
                    'h': prev_box['h'] * SMOOTHING_FACTOR + new_box['h'] * (1 - SMOOTHING_FACTOR),
                }
            else:
                box_data = new_box
            prev_box = box_data
    else:
        # No object found
        frames_stationary = 0
        IS_MOVING = False
        last_centroid = None
        cached_class = "Scanning..."


    # --- 2. AI CLASSIFICATION (Only if STATIONARY) ---
    # We obey user rule: "if sliding, ai should not detect"
    if object_present and not IS_MOVING and frame_count % AI_INTERVAL == 0:
        # Preprocess
        image = cv2.resize(frame, (224, 224), interpolation=cv2.INTER_AREA)
        image = np.asarray(image, dtype=np.float32).reshape(1, 224, 224, 3)
        image = (image / 127.5) - 1

        # Predict
        prediction = model.predict(image)
        index = np.argmax(prediction)
        raw_class_name = class_names[index].strip()
        confidence_score = prediction[0][index]
        
        if confidence_score > 0.4:
            prediction_history.append(raw_class_name)
        
        if prediction_history:
            cached_class = Counter(prediction_history).most_common(1)[0][0]
        else:
            cached_class = raw_class_name
            
        cached_conf = float(confidence_score) * 100
        cached_label_id = int(index)
        
        # Estimate weight based on bounding box size and category
        if box_data:
            cached_weight = estimate_weight(cached_class, box_data['w'], box_data['h'])
        else:
            cached_weight = 0.0

    # --- 3. EMIT DATA ---
    current_time = time.time()
    # Throttle: Max 15 updates per second to preventing frontend lag
    if current_time - last_emit_time > 0.066: 
        try:
            payload = {
                'class': cached_class if not IS_MOVING else "Moving...",
                'confidence': cached_conf if not IS_MOVING else 0,
                'label_id': cached_label_id if not IS_MOVING else -1,
                'box': box_data,
                'is_moving': IS_MOVING,     # Flag for Frontend
                'object_present': object_present, # Flag for Frontend
                'estimated_weight': cached_weight if not IS_MOVING else 0  # Weight in grams
            }
            sio.emit('ai_inference', payload)
            last_emit_time = current_time
        except Exception:
            pass     
    
    # Tiny sleep to yield CPU if loop is spinning too fast
    time.sleep(0.001)     

    # --- 4. SORTING LOGIC ---
    if not IS_MOVING and cached_conf > 90:
        dashboard_bin_id = -1
        name_lower = cached_class.lower()
        if "bio" in name_lower: dashboard_bin_id = 2
        elif "haz" in name_lower: dashboard_bin_id = 3
        elif "rec" in name_lower or "dry" in name_lower: dashboard_bin_id = 1
        elif "wet" in name_lower or "org" in name_lower: dashboard_bin_id = 0
        elif "met" in name_lower or "e-waste" in name_lower: dashboard_bin_id = 1
            
        if dashboard_bin_id != -1:
            current_time = time.time()
            if current_time - last_sorted_time > 2.0:
                print(f"SORTING: {cached_class} ({cached_conf:.1f}%) -> Bin {dashboard_bin_id}")
                sio.emit('item_sorted', {'type': dashboard_bin_id}) 
                last_sorted_time = current_time

    if cv2.waitKey(1) == 27:
        break

vs.stop()
cv2.destroyAllWindows()
sio.disconnect()
