/*
 * Master ESP32 Code for Waste Management System
 * - Connects to Node.js Backend via Socket.io
 * - Receives Classification (0,1,2,3) from Slave 1 (via Serial or I2C? Assuming Serial here)
 * - Controls Slave 2 (Servo/Conveyor) 
 * - Reads Sensors from Bin 3 (Bio) - Load Cell (HX711) + Ultrasonic (HC-SR04)
 * 
 * Hardware Pins:
 * - HX711 Load Cell: DT=21, SCK=22
 * - Ultrasonic: TRIG=5, ECHO=18
 * - Slave 1 RX/TX: Serial2 (16, 17)
 */

#include <WiFi.h>
#include <SocketIoClient.h>
#include <HX711.h>

// --- WIFI CONFIG ---
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// --- BACKEND CONFIG ---
// IP Address of the Laptop running the Node.js Server
char host[] = "192.168.1.5"; // <--- CHANGE THIS TO YOUR LAPTOP ID
int port = 3001;

SocketIoClient socket;
WiFiClient client;

// --- SENSORS (For Bin 3 - Bio) ---
const int LOADCELL_DOUT_PIN = 21;
const int LOADCELL_SCK_PIN = 22;
HX711 scale;

const int TRIG_PIN = 5;
const int ECHO_PIN = 18;

// --- STATE ---
bool systemOn = false;
String currentSpeed = "medium";

void setup() {
  Serial.begin(115200);
  
  // Connect WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected");

  // Setup Sensors
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(2280.f); // Calibrate this!
  scale.tare();
  
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  // Setup Socket.io
  socket.on("esp_control", handleControl);
  socket.on("connect", [](const char * payload, size_t length) {
    Serial.println("Socket.io Connected");
  });
  
  socket.begin(host, port);
}

void loop() {
  socket.loop();

  if (systemOn) {
    // 1. Read Sensors (Bin 3)
    float weight = scale.get_units(1); // 1 reading
    
    // Ultrasonic
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);
    long duration = pulseIn(ECHO_PIN, HIGH);
    float distance = duration * 0.034 / 2;
    // Map distance to Volume % (Assuming bin height 50cm)
    float volume = map(constrain(distance, 0, 50), 50, 0, 0, 100); 

    // Send Data every 2 seconds or if changed significantly
    static unsigned long lastSend = 0;
    if (millis() - lastSend > 2000) {
      String json = "{\"weight\":" + String(weight) + ",\"volume\":" + String(volume) + "}";
      socket.emit("sensor_data", json.c_str());
      lastSend = millis();
    }
  }

  // 2. Check for Sorting Signals from Slave 1
  if (Serial.available()) {
    char type = Serial.read(); // '0', '1', '2', '3'
    if (type >= '0' && type <= '3') {
       String json = "{\"type\":\"" + String(type) + "\"}";
       socket.emit("item_sorted", json.c_str());
       
       // Trigger Slave 2 to move servo
       // Wire.write(type)... or DigitalWrite to Slave 2
    }
  }
}

void handleControl(const char * payload, size_t length) {
  // payload: {"command":"power","value":true}
  Serial.printf("Control: %s\n", payload);
  
  // Parse JSON (Basic parsing)
  String msg = String(payload);
  if (msg.indexOf("power") > 0) {
     if (msg.indexOf("true") > 0) systemOn = true;
     else systemOn = false;
  }
  // Implement speed control parsing here
}
