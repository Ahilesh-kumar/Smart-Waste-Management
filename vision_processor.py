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
import time
from collections import deque, Counter

last_sorted_time = 0
frame_skip_counter = 0
PROCESS_EVERY_N_FRAMES = 3 # Only process 1 out of 3 frames to increase speed
prediction_history = deque(maxlen=10) # Store last 10 predictions for smoothing

print(f"Connecting to Camera at: {IP_CAM_URL} ...")
cap = cv2.VideoCapture(IP_CAM_URL)

if not cap.isOpened():
    print("❌ ERROR: Could not open camera stream!")
    print(f"    -> Check if your phone is ON and IP Webcam is running.")
    print(f"    -> Check if the IP is correct: {IP_CAM_URL}")
    exit()

print("✅ Camera Connected! Starting Video Feed...")

while True:
    ret, frame = cap.read()
    if not ret:
        print("Failed to grab frame")
        break

    # Show the Feed (Always show every frame for smoothness)
    cv2.imshow("Waste Classifier", frame)
    
    # --- OPTIMIZATION: SKIP FRAMES ---
    frame_skip_counter += 1
    if frame_skip_counter % PROCESS_EVERY_N_FRAMES != 0:
        if cv2.waitKey(1) == 27: break
        continue # Skip AI processing for this frame
    
    # 4. Preprocess for Teachable Machine (224x224)
    # Resize to 224x224
    image = cv2.resize(frame, (224, 224), interpolation=cv2.INTER_AREA)
    image = np.asarray(image, dtype=np.float32).reshape(1, 224, 224, 3)
    image = (image / 127.5) - 1

    # --- REAL OBJECT TRACKING (OpenCV) ---
    # Find the object to draw a REAL box around it
    # Downscale for faster contour detection
    small_frame = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
    gray = cv2.cvtColor(small_frame, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
    
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    box_data = None
    if contours:
        largest_contour = max(contours, key=cv2.contourArea)
        if cv2.contourArea(largest_contour) > 500: # Adjusted for smaller scale
            x, y, w, h = cv2.boundingRect(largest_contour)
            
            # Scale back up to original percentage
            height, width, _ = small_frame.shape
            
            # Calculate percentages based on the small frame (ratios preserve)
            pct_x = (x / width) * 100
            pct_y = (y / height) * 100
            pct_w = (w / width) * 100
            pct_h = (h / height) * 100
            
            box_data = {'x': pct_x, 'y': pct_y, 'w': pct_w, 'h': pct_h}

    # 5. Predict
    prediction = model.predict(image)
    index = np.argmax(prediction)
    raw_class_name = class_names[index].strip()
    confidence_score = prediction[0][index]
    
    # --- STABILIZATION: SMOOTHING ---
    if confidence_score > 0.5: # Only count confident guesses
        prediction_history.append(raw_class_name)
    
    # Find most common class in history (Majority Vote)
    if prediction_history:
        smoothed_class_name = Counter(prediction_history).most_common(1)[0][0]
    else:
        smoothed_class_name = raw_class_name

    # 6. Send Inference Data (Real-time Confidence + Box)
    try:
        payload = {
            'class': smoothed_class_name, # Send smoothed name
            'confidence': float(confidence_score) * 100,
            'label_id': int(index),
            'box': box_data
        }
        sio.emit('ai_inference', payload)
    except Exception as e:
        pass     

    # 7. Send to Backend for Sorting (with Debounce)
    if confidence_score > 0.90:
        dashboard_bin_id = -1
        name_lower = smoothed_class_name.lower() # Use smoothed name for logic
        
        # Robust Mapping
        if "bio" in name_lower:
            dashboard_bin_id = 2
        elif "haz" in name_lower:
            dashboard_bin_id = 3
        elif "rec" in name_lower or "dry" in name_lower:
            dashboard_bin_id = 1
        elif "wet" in name_lower or "org" in name_lower:
            dashboard_bin_id = 0
        elif "met" in name_lower or "e-waste" in name_lower:
            dashboard_bin_id = 1
            
        if dashboard_bin_id != -1:
            current_time = time.time()
            if current_time - last_sorted_time > 2.0:
                print(f"SORTING: {smoothed_class_name} (Conf: {confidence_score:.2f}) -> Bin {dashboard_bin_id}")
                sio.emit('item_sorted', {'type': dashboard_bin_id}) 
                last_sorted_time = current_time

    # Listen to the keyboard for presses.
    keyboard_input = cv2.waitKey(1)
    if keyboard_input == 27: # ESC key
        break

cap.release()
cv2.destroyAllWindows()
sio.disconnect()
