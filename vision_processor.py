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
# 3. Start Video Capture
import time
from collections import deque, Counter

last_sorted_time = 0
frame_count = 0
AI_INTERVAL = 10 # Run AI every 10 frames (smooth video, prediction every ~0.3s)
prediction_history = deque(maxlen=3) # Reduced from 10 for faster switching

# Caching for frames between AI runs
cached_class = "Waiting..."
cached_conf = 0.0
cached_label_id = -1

# Box Smoothing (to stop jitter)
prev_box = None
SMOOTHING_FACTOR = 0.6 # 0 = no smoothing, 1 = full smoothing (higher = more stable but slower)

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

    # Show the Feed
    cv2.imshow("Waste Classifier", frame)
    frame_count += 1
    
    # --- 1. FAST OBJECT TRACKING (Run EVERY Frame for smooth box) ---
    # Focus on the CENTER of the frame (where waste items are placed)
    small_frame = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
    height, width, _ = small_frame.shape
    
    # Define Detection Zone (Center 60% of frame)
    margin_x = int(width * 0.2)  # 20% margin on each side
    margin_y = int(height * 0.2)
    roi = small_frame[margin_y:height-margin_y, margin_x:width-margin_x]
    
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    box_data = None
    if contours:
        largest_contour = max(contours, key=cv2.contourArea)
        if cv2.contourArea(largest_contour) > 2000:
            x, y, w, h = cv2.boundingRect(largest_contour)
            
            # Offset x,y back to full frame coordinates
            x += margin_x
            y += margin_y
            
            # Convert to percentage of FULL frame
            pct_x = (x / width) * 100
            pct_y = (y / height) * 100
            pct_w = (w / width) * 100
            pct_h = (h / height) * 100
            
            new_box = {'x': pct_x, 'y': pct_y, 'w': pct_w, 'h': pct_h}
            
            # --- SMOOTHING: Blend with previous box to reduce jitter ---
            if prev_box:
                box_data = {
                    'x': prev_box['x'] * SMOOTHING_FACTOR + new_box['x'] * (1 - SMOOTHING_FACTOR),
                    'y': prev_box['y'] * SMOOTHING_FACTOR + new_box['y'] * (1 - SMOOTHING_FACTOR),
                    'w': prev_box['w'] * SMOOTHING_FACTOR + new_box['w'] * (1 - SMOOTHING_FACTOR),
                    'h': prev_box['h'] * SMOOTHING_FACTOR + new_box['h'] * (1 - SMOOTHING_FACTOR),
                }
            else:
                box_data = new_box
            
            prev_box = box_data # Store for next frame

    # --- 2. HEAVY AI CLASSIFICATION (Run EVERY Nth Frame) ---
    if frame_count % AI_INTERVAL == 0:
        # Preprocess
        image = cv2.resize(frame, (224, 224), interpolation=cv2.INTER_AREA)
        image = np.asarray(image, dtype=np.float32).reshape(1, 224, 224, 3)
        image = (image / 127.5) - 1

        # Predict
        prediction = model.predict(image)
        index = np.argmax(prediction)
        raw_class_name = class_names[index].strip()
        confidence_score = prediction[0][index]
        
        # Smooth
        if confidence_score > 0.5:
            prediction_history.append(raw_class_name)
        
        if prediction_history:
            cached_class = Counter(prediction_history).most_common(1)[0][0]
        else:
            cached_class = raw_class_name
            
        cached_conf = float(confidence_score) * 100
        cached_label_id = int(index)

    # --- 3. EMIT DATA (Every Frame) ---
    # We send the NEW box position + the OLD/CACHED AI label
    try:
        payload = {
            'class': cached_class,
            'confidence': cached_conf,
            'label_id': cached_label_id,
            'box': box_data # Real-time box!
        }
        sio.emit('ai_inference', payload)
    except Exception as e:
        pass     

    # --- 4. SORTING LOGIC (Using Cached Data) ---
    # Only trigger sort if we are confident and debounce time passed
    if cached_conf > 90:
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

    # Listen to the keyboard for presses.
    keyboard_input = cv2.waitKey(1)
    if keyboard_input == 27: # ESC key
        break

cap.release()
cv2.destroyAllWindows()
sio.disconnect()
