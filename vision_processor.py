"""
Vision Processor for Waste Management System
Refactored for Robustness and Maintainability
"""

import os
import time
import cv2
import numpy as np
import socketio
import threading
import datetime
from collections import deque, Counter

# Force Legacy Keras
os.environ["TF_USE_LEGACY_KERAS"] = "1"
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.layers import DepthwiseConv2D

# --- CONFIGURATION ---
# Load from shared config.json (single source of truth for IP)
def load_config():
    config_path = os.path.join(os.path.dirname(__file__), 'config.json')
    try:
        import json
        with open(config_path, 'r') as f:
            return json.load(f)
    except:
        return {}

_shared_config = load_config()

class Config:
    # Read IP from config.json, fallback to env var, then default
    _cam_ip = _shared_config.get('camera', {}).get('ip', '192.0.0.4')
    _cam_port = _shared_config.get('camera', {}).get('port', '8080')
    IP_CAM_URL = os.getenv("IP_CAM_URL", f"http://{_cam_ip}:{_cam_port}/video")
    BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")
    MODEL_PATH = "keras_model.h5"
    LABELS_PATH = "labels.txt"
    AI_INTERVAL = 1
    MOVEMENT_THRESHOLD = 2.0
    STATIONARY_THRESHOLD = 5

# --- HELPER CLASSES ---

class CustomDepthwiseConv2D(DepthwiseConv2D):
    """Patch for Teachable Machine models in newer TF versions"""
    def __init__(self, **kwargs):
        kwargs.pop('groups', None)
        super().__init__(**kwargs)

class VideoStream:
    """Reading frames in a separate thread with robust reconnection"""
    def __init__(self, src=0):
        self.src = src
        self.stopped = False
        self.grabbed = False
        self.frame = None
        self.stream = self._create_capture()
        self.fail_count = 0
        
        if self.stream and self.stream.isOpened():
             (self.grabbed, self.frame) = self.stream.read()
    
    def _create_capture(self):
        """Create VideoCapture with optimized settings for IP cameras"""
        cap = cv2.VideoCapture(self.src, cv2.CAP_FFMPEG)
        if cap.isOpened():
            # Increase buffer size for slow connections
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 3)
            # Set longer timeout (10 seconds)
            cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 10000)
            cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 10000)
            print(f"✅ Camera connected: {self.src}")
        return cap
    
    def start(self):
        threading.Thread(target=self.update, args=(), daemon=True).start()
        return self

    def update(self):
        while not self.stopped:
            if not self.stream or not self.stream.isOpened():
                print(f"Stream disconnected, retrying {self.src}...")
                if self.stream:
                    self.stream.release()
                time.sleep(3)  # Wait longer before retry
                self.stream = self._create_capture()
                continue
                
            (grabbed, frame) = self.stream.read()
            if grabbed:
                self.grabbed = grabbed
                self.frame = frame
                self.fail_count = 0  # Reset on success
            else:
                self.fail_count += 1
                if self.fail_count > 30:  # ~3 seconds of failures
                    print("Too many read failures, reconnecting...")
                    self.stream.release()
                    self.stream = None
                    self.fail_count = 0
                time.sleep(0.1)

    def read(self):
        return self.frame

    def stop(self):
        self.stopped = True
        if self.stream:
            self.stream.release()

# --- MAIN CLASSIFIER CLASS ---

class WasteClassifier:
    def __init__(self):
        self.sio = socketio.Client()
        self.stopped = False
        
        # Tracking State
        self.prediction_history = deque(maxlen=5)
        self.frame_count = 0
        self.last_emit_time = 0
        self.last_sorted_time = 0
        
        # Motion Detection
        self.last_centroid = None
        self.frames_stationary = 0
        self.is_moving = False
        
        # Box Smoothing
        self.prev_box = None
        
        # Analytics
        self.hourly_detections = {h: 0 for h in range(24)}
        self.bin_fill_levels = {0: 0.0, 1: 0.0, 2: 0.0, 3: 0.0}
        
        # Init components
        self.setup_socket()
        self.load_model_data()
        
    def setup_socket(self):
        @self.sio.event
        def connect():
            print("✅ Connected to Backend Server")

        @self.sio.event
        def disconnect():
            print("❌ Disconnected from Server")
            
        @self.sio.event
        def connect_error(data):
            pass # Suppress noise

    def connect_backend(self):
        while not self.stopped:
            try:
                self.sio.connect(Config.BACKEND_URL, transports=['websocket', 'polling'], wait_timeout=10)
                break
            except Exception as e:
                print(f"Connecting to Backend at {Config.BACKEND_URL}... ({e})")
                time.sleep(3)

    def load_model_data(self):
        print("Loading AI Model...")
        np.set_printoptions(suppress=True)
        try:
            self.model = load_model(Config.MODEL_PATH, custom_objects={'DepthwiseConv2D': CustomDepthwiseConv2D}, compile=False)
            self.class_names = [line.strip() for line in open(Config.LABELS_PATH, "r").readlines()]
            print(f"✅ Model Loaded. Categories: {self.class_names}")
        except Exception as e:
            print(f"❌ Failed to load model: {e}")
            exit(1)

    def process_frame(self, frame):
        self.frame_count += 1
        
        # 1. Resize/Preprocessing
        small_frame = cv2.resize(frame, (0, 0), fx=0.4, fy=0.4)
        height, width, _ = small_frame.shape
        margin_x = int(width * 0.2)
        margin_y = int(height * 0.2)
        
        # Motion ROI
        roi = small_frame[margin_y:height-margin_y, margin_x:width-margin_x]
        
        # Motion Logic
        self.detect_motion(roi, width, height, margin_x, margin_y)
        
        cached_class = "Scanning..."
        cached_conf = 0.0
        cached_label_id = -1
        cached_weight = 0.0
        
        # 2. AI Inference
        if self.object_present and not self.is_moving and self.frame_count % Config.AI_INTERVAL == 0:
             cached_class, cached_conf, cached_label_id = self.run_inference(frame)
             
             # Weight Estimation
             if self.box_data:
                 cached_weight = self.estimate_weight(cached_class, self.box_data['w'], self.box_data['h'])
        
        # 3. Emit Data
        self.emit_realtime_data(cached_class, cached_conf, cached_label_id, cached_weight)
        
        # 4. Handle sorting/counting when detection is confident and stable
        if cached_conf > 60.0 and cached_class not in ["Scanning...", "Moving..."]:
            self.handle_sorting(cached_class, cached_conf, cached_weight)

    def detect_motion(self, roi, width, height, margin_x, margin_y):
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        self.object_present = False
        self.box_data = None
        
        if contours:
            largest = max(contours, key=cv2.contourArea)
            if cv2.contourArea(largest) > 1500:
                self.object_present = True
                x, y, w, h = cv2.boundingRect(largest)
                cx, cy = x + w/2, y + h/2
                
                # Check movement
                if self.last_centroid:
                    dist = np.sqrt((cx - self.last_centroid[0])**2 + (cy - self.last_centroid[1])**2)
                    if dist > Config.MOVEMENT_THRESHOLD:
                        self.frames_stationary = 0
                        self.is_moving = True
                    else:
                        self.frames_stationary += 1
                        if self.frames_stationary > Config.STATIONARY_THRESHOLD:
                            self.is_moving = False
                            
                self.last_centroid = (cx, cy)
                
                # Box processing
                x += margin_x
                y += margin_y
                new_box = {
                    'x': (x/width)*100, 'y': (y/height)*100,
                    'w': (w/width)*100, 'h': (h/height)*100
                }
                
                # Smooth box
                if self.prev_box:
                    s = 0.5 
                    self.box_data = {
                        k: self.prev_box[k]*s + new_box[k]*(1-s) for k in new_box
                    }
                else:
                    self.box_data = new_box
                self.prev_box = self.box_data
        else:
             self.frames_stationary = 0
             self.is_moving = False
             self.last_centroid = None

    def run_inference(self, frame):
        image = cv2.resize(frame, (224, 224), interpolation=cv2.INTER_AREA)
        image = np.asarray(image, dtype=np.float32).reshape(1, 224, 224, 3)
        image = (image / 127.5) - 1
        
        prediction = self.model.predict(image, verbose=0)
        idx = np.argmax(prediction)
        
        conf = float(prediction[0][idx])
        label = self.class_names[idx]
        
        if conf > 0.4:
            self.prediction_history.append(label)
            
        if self.prediction_history:
            # Persistence Logic: Only confirm if > 3 occurrences in last 5
            counts = Counter(self.prediction_history)
            most_common = counts.most_common(1)[0]
            if most_common[1] >= 3:
                final_label = most_common[0]
            else:
                final_label = "Scanning..."
        else:
            final_label = label
            
        return final_label, conf * 100, int(idx)

    def estimate_weight(self, class_name, w_pct, h_pct):
         # Simplified density map
         densities = {
             'bio': 0.025, 'hazard': 0.08, 'haz': 0.08, 'wet': 0.05, 
             'dry': 0.015, 'metal': 0.12, 'default': 0.03
         }
         
         density = densities['default']
         for k, v in densities.items():
             if k in class_name.lower(): 
                 density = v
                 break
                 
         # Area relative to 640x480 scale
         area = (w_pct/100 * 640 * 0.4) * (h_pct/100 * 480 * 0.4)
         weight = area * density
         return round(max(1.0, min(500.0, weight)), 1)

    def emit_realtime_data(self, cls, conf, label_id, weight):
        now = time.time()
        # Increased to ~30 FPS cap to match IP camera phone
        if now - self.last_emit_time > 0.033: 
            payload = {
                'class': cls if not self.is_moving else "Moving...",
                'confidence': conf if not self.is_moving else 0,
                'label_id': label_id if not self.is_moving else -1,
                'box': self.box_data,
                'is_moving': self.is_moving,
                'object_present': self.object_present,
                'estimated_weight': weight if not self.is_moving else 0
            }
            try:
                self.sio.emit('ai_inference', payload)
                self.last_emit_time = now
            except:
                pass

    def handle_sorting(self, cls, conf, weight):
        now = time.time()
        if now - self.last_sorted_time > 2.0:
            # Map class to bin
            bin_id = -1
            name = cls.lower()
            
            # Use Index-based mapping for the new model
            if "0" in name or "rec" in name: bin_id = 0
            elif "1" in name or "wet" in name: bin_id = 1
            elif "2" in name or "haz" in name: bin_id = 2
            elif "3" in name or "dry" in name: bin_id = 3
            
            if bin_id != -1:
                print(f"SORTING: {cls} -> Bin {bin_id}")
                self.sio.emit('item_sorted', {'type': bin_id})
                self.last_sorted_time = now
                
                # Update Stats
                h = datetime.datetime.now().hour
                self.hourly_detections[h] += 1
                self.bin_fill_levels[bin_id] += weight
                
                # Emit Heatmap & Predictions
                self.emit_analytics()

    def emit_analytics(self):
         heatmap = [{'hour': f"{h:02d}:00", 'value': c} for h, c in self.hourly_detections.items() if c > 0]
         self.sio.emit('heatmap_update', {'hourly': heatmap})
         
         predictions = {}
         CAPACITY = 5000.0
         for bid, grams in self.bin_fill_levels.items():
             remaining = CAPACITY - grams
             if remaining <= 0: predictions[bid] = "FULL"
             else: predictions[bid] = f"{int(remaining/100.0)}m"
             
         self.sio.emit('prediction_update', {'predictions': predictions})

    def run(self):
        print(f"Opening Camera: {Config.IP_CAM_URL}")
        vs = VideoStream(Config.IP_CAM_URL).start()
        print("Waiting for camera warmup...")
        time.sleep(2.0)
        
        self.connect_backend()
        
        print("✅ System Ready. Press ESC to stop.")
        try:
            while not self.stopped:
                frame = vs.read()
                if frame is None:
                    time.sleep(0.1)
                    continue
                
                self.process_frame(frame)
                
                # Optional: Show feed
                # cv2.imshow("Waste AI", frame)
                # if cv2.waitKey(1) == 27: break
                
                time.sleep(0.001)
        except KeyboardInterrupt:
            print("Stopping...")
        finally:
            vs.stop()
            self.sio.disconnect()
            cv2.destroyAllWindows()

if __name__ == "__main__":
    app = WasteClassifier()
    app.run()
