"""
Vision Processor for Waste Management System
--------------------------------------------
1. Captures video from Phone (IP Webcam).
2. Runs Teachable Machine Model (Keras/TensorFlow).
3. Sends Classification (0,1,2,3) to Node.js Backend via Socket.io.
"""

import cv2
import numpy as np
import socketio
import tensorflow as tf
from tensorflow.keras.models import load_model

# CONFIG
IP_CAM_URL = "http://192.168.1.5:8080/video" # <--- UPDATE THIS
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
model = load_model(MODEL_PATH, compile=False)
class_names = open(LABELS_PATH, "r").readlines()

# 3. Start Video Capture
cap = cv2.VideoCapture(IP_CAM_URL)

while True:
    ret, frame = cap.read()
    if not ret:
        print("Failed to grab frame")
        break

    # Show the Feed
    # Optional: Rotate if your mounted camera is sideways
    # frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE) 
    cv2.imshow("Waste Classifier", frame)

    # 4. Preprocess for Teachable Machine (224x224)
    # Resize to 224x224
    image = cv2.resize(frame, (224, 224), interpolation=cv2.INTER_AREA)
    # Make the image a numpy array and reshape it to the models input shape.
    image = np.asarray(image, dtype=np.float32).reshape(1, 224, 224, 3)
    # Normalize the image array
    image = (image / 127.5) - 1

    # 5. Predict
    prediction = model.predict(image)
    index = np.argmax(prediction)
    class_name = class_names[index].strip()
    confidence_score = prediction[0][index]

    # 6. Send Inference Data (Real-time Confidence)
    # Emit for every frame (or throttle if needed)
    try:
        sio.emit('ai_inference', {
            'class': class_name,
            'confidence': float(confidence_score) * 100, # Send as percentage
            'label_id': int(index)
        })
    except Exception as e:
        pass # Ignore emit errors to keep video smooth

    # 7. Send to Backend for Sorting (if confidence > 95% and valid waste)
    if confidence_score > 0.95:
        # print(f"Sorting Class: {class_name} ({confidence_score:.2f})")
        # Ensure we only send sort command occasionally or handle logic in backend
        # For now, let's keep the original logic but commented out to avoid spam, 
        # or implement a "cooldown" in a real scenario.
        # But per user request earlier: "item_sorted" updates bins.
        # We can emit 'item_sorted' here if we want automatic sorting.
        # Let's emit it but maybe throttle it in a real app. 
        # For this demo, we'll assume the user might manually trigger or we just show the confidence.
        # Re-enabling the sort trigger for the 'Real' behavior requested:
        sio.emit('item_sorted', {'type': int(index)}) 
        cv2.waitKey(2000) # Wait 2s to simulate belt moving / avoid double count

    # Listen to the keyboard for presses.
    keyboard_input = cv2.waitKey(1)
    if keyboard_input == 27: # ESC key
        break

cap.release()
cv2.destroyAllWindows()
sio.disconnect()
