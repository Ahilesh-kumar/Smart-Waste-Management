/*
 * ============================================================
 * Smart Waste Management System - ESP32 Controller
 * ============================================================
 *
 * This sketch connects to the Node.js backend via Socket.IO
 * and controls the conveyor belt based on dashboard commands.
 *
 * REQUIRED LIBRARIES (Install via Arduino Library Manager):
 * 1. WebSockets by Markus Sattler (arduinoWebSockets)
 * 2. ArduinoJson by Benoit Blanchon
 *
 * WIRING:
 * - Motor Control Pin: GPIO 25 (PWM for speed control)
 * - IR Sensor Pin: GPIO 34 (to detect items passing)
 * - Optional: LED indicator on GPIO 2 (built-in LED)
 *
 * BIN MAPPING (when AI classifies item):
 * 0 = Dry Waste
 * 1 = Wet Waste
 * 2 = Hazardous
 * 3 = Recyclable
 */

#include <ArduinoJson.h>
#include <WebSocketsClient.h>
#include <WiFi.h>


// ============================================================
// CONFIGURATION - CHANGE THESE VALUES
// ============================================================

// WiFi Credentials
const char *WIFI_SSID = "YOUR_WIFI_SSID";
const char *WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Backend Server (Your laptop's IP address)
const char *SERVER_IP = "192.168.1.100"; // Change to your laptop's local IP
const int SERVER_PORT = 3001;

// Pin Definitions
#define MOTOR_PIN 25     // PWM pin for motor speed control
#define IR_SENSOR_PIN 34 // IR sensor to detect item passage
#define LED_PIN 2        // Built-in LED for status indication

// Speed PWM Values (0-255)
#define SPEED_SLOW 80
#define SPEED_MEDIUM 150
#define SPEED_FAST 255

// Debounce timing
#define ITEM_DEBOUNCE_MS 2000 // Minimum time between item detections

// ============================================================
// GLOBAL VARIABLES
// ============================================================

WebSocketsClient webSocket;

// System State
bool systemPowerOn = false;
String currentSpeed = "medium";
int currentPWM = SPEED_MEDIUM;

// Item Detection
unsigned long lastItemTime = 0;
int lastBinType = -1; // Set by AI, used when item passes sensor

// Connection State
bool isConnected = false;
unsigned long lastReconnectAttempt = 0;

// ============================================================
// SETUP
// ============================================================

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Smart Waste Management ESP32 ===");

  // Initialize pins
  pinMode(MOTOR_PIN, OUTPUT);
  pinMode(IR_SENSOR_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);

  // Start with motor OFF
  analogWrite(MOTOR_PIN, 0);
  digitalWrite(LED_PIN, LOW);

  // Connect to WiFi
  connectWiFi();

  // Setup Socket.IO connection
  setupSocketIO();
}

// ============================================================
// MAIN LOOP
// ============================================================

void loop() {
  // Handle WebSocket events
  webSocket.loop();

  // Check for item passing IR sensor
  checkItemSensor();

  // Blink LED when connected
  if (isConnected) {
    static unsigned long lastBlink = 0;
    if (millis() - lastBlink > 1000) {
      digitalWrite(LED_PIN, !digitalRead(LED_PIN));
      lastBlink = millis();
    }
  }

  // Small delay to prevent watchdog issues
  delay(10);
}

// ============================================================
// WIFI CONNECTION
// ============================================================

void connectWiFi() {
  Serial.printf("Connecting to WiFi: %s", WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    digitalWrite(LED_PIN, HIGH);
  } else {
    Serial.println("\n❌ WiFi Connection Failed!");
    Serial.println("Restarting in 5 seconds...");
    delay(5000);
    ESP.restart();
  }
}

// ============================================================
// SOCKET.IO SETUP
// ============================================================

void setupSocketIO() {
  // Socket.IO uses WebSocket with specific path
  String path = "/socket.io/?EIO=4&transport=websocket";

  webSocket.begin(SERVER_IP, SERVER_PORT, path.c_str());
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);

  Serial.printf("Connecting to backend: %s:%d\n", SERVER_IP, SERVER_PORT);
}

// ============================================================
// WEBSOCKET EVENT HANDLER
// ============================================================

void webSocketEvent(WStype_t type, uint8_t *payload, size_t length) {
  switch (type) {
  case WStype_DISCONNECTED:
    Serial.println("❌ Disconnected from server");
    isConnected = false;
    digitalWrite(LED_PIN, LOW);
    // Stop motor when disconnected for safety
    setMotorSpeed(0);
    break;

  case WStype_CONNECTED:
    Serial.println("✅ Connected to server!");
    isConnected = true;
    digitalWrite(LED_PIN, HIGH);
    break;

  case WStype_TEXT:
    handleSocketMessage((char *)payload);
    break;

  case WStype_ERROR:
    Serial.println("⚠️ WebSocket Error");
    break;

  default:
    break;
  }
}

// ============================================================
// SOCKET MESSAGE HANDLER
// ============================================================

void handleSocketMessage(char *payload) {
  // Socket.IO messages format: 42["event_name",{data}]
  // The "42" prefix indicates a message event

  if (payload[0] != '4' || payload[1] != '2') {
    // Handle other Socket.IO protocol messages (ping/pong)
    if (payload[0] == '2') {
      // Ping - respond with pong
      webSocket.sendTXT("3");
    }
    return;
  }

  // Skip the "42" prefix
  char *jsonStart = payload + 2;

  // Parse the JSON array: ["event_name", {data}]
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, jsonStart);

  if (error) {
    Serial.printf("JSON Parse Error: %s\n", error.c_str());
    return;
  }

  // Get event name (first element of array)
  const char *eventName = doc[0];

  if (strcmp(eventName, "esp_control") == 0) {
    // Dashboard control command
    handleControlCommand(doc[1]);
  } else if (strcmp(eventName, "ai_inference") == 0) {
    // AI detected an item - store the bin type for when it passes sensor
    handleAIInference(doc[1]);
  }
}

// ============================================================
// CONTROL COMMAND HANDLER
// ============================================================

void handleControlCommand(JsonObject data) {
  const char *command = data["command"];

  if (strcmp(command, "power") == 0) {
    // Power ON/OFF
    systemPowerOn = data["value"].as<bool>();
    Serial.printf("⚡ System Power: %s\n", systemPowerOn ? "ON" : "OFF");

    if (systemPowerOn) {
      setMotorSpeed(currentPWM);
    } else {
      setMotorSpeed(0);
    }
  } else if (strcmp(command, "speed") == 0) {
    // Speed control
    currentSpeed = data["value"].as<String>();
    Serial.printf("🚀 Speed: %s\n", currentSpeed.c_str());

    if (currentSpeed == "slow") {
      currentPWM = SPEED_SLOW;
    } else if (currentSpeed == "medium") {
      currentPWM = SPEED_MEDIUM;
    } else if (currentSpeed == "fast") {
      currentPWM = SPEED_FAST;
    }

    // Apply speed if system is ON
    if (systemPowerOn) {
      setMotorSpeed(currentPWM);
    }
  }
  // Note: Direction and Servo commands are ignored (display only)
}

// ============================================================
// AI INFERENCE HANDLER
// ============================================================

void handleAIInference(JsonObject data) {
  // AI has classified an item
  // Store the bin type for when the item passes the IR sensor

  int labelId = data["label_id"].as<int>();
  float confidence = data["confidence"].as<float>();
  const char *className = data["class"];

  // Only accept if confidence > 60%
  if (confidence > 60.0 && labelId >= 0 && labelId <= 3) {
    lastBinType = labelId;
    Serial.printf("🔍 AI Detection: %s (Bin %d, %.1f%%)\n", className, labelId,
                  confidence);
  }
}

// ============================================================
// ITEM SENSOR CHECK
// ============================================================

void checkItemSensor() {
  // Read IR sensor (LOW = item detected for most IR sensors)
  bool itemDetected = digitalRead(IR_SENSOR_PIN) == LOW;

  unsigned long now = millis();

  // Debounce and check if we have a valid bin type from AI
  if (itemDetected && (now - lastItemTime > ITEM_DEBOUNCE_MS) &&
      lastBinType >= 0 && lastBinType <= 3) {

    // Item passed sensor - send to backend
    sendItemSorted(lastBinType);

    lastItemTime = now;
    lastBinType = -1; // Reset until next AI detection
  }
}

// ============================================================
// SEND ITEM_SORTED EVENT
// ============================================================

void sendItemSorted(int binIndex) {
  if (!isConnected)
    return;

  // Build Socket.IO message: 42["item_sorted",{"type":0}]
  StaticJsonDocument<128> doc;
  JsonArray arr = doc.to<JsonArray>();
  arr.add("item_sorted");

  JsonObject data = arr.createNestedObject();
  data["type"] = binIndex;

  String message;
  serializeJson(doc, message);
  message = "42" + message; // Add Socket.IO prefix

  webSocket.sendTXT(message);

  const char *binNames[] = {"Dry Waste", "Wet Waste", "Hazardous",
                            "Recyclable"};
  Serial.printf("📦 Item Sorted: %s (Bin %d)\n", binNames[binIndex], binIndex);
}

// ============================================================
// MOTOR CONTROL
// ============================================================

void setMotorSpeed(int pwmValue) {
  analogWrite(MOTOR_PIN, pwmValue);
  Serial.printf("🔧 Motor PWM: %d\n", pwmValue);
}

// ============================================================
// OPTIONAL: Send sensor data (weight/volume)
// Call this if you have weight or ultrasonic sensors
// ============================================================

void sendSensorData(float weight, float volume) {
  if (!isConnected)
    return;

  StaticJsonDocument<128> doc;
  JsonArray arr = doc.to<JsonArray>();
  arr.add("sensor_data");

  JsonObject data = arr.createNestedObject();
  data["weight"] = weight; // kg
  data["volume"] = volume; // percentage (0-100)

  String message;
  serializeJson(doc, message);
  message = "42" + message;

  webSocket.sendTXT(message);

  Serial.printf("📊 Sensor Data: Weight=%.2f kg, Volume=%.1f%%\n", weight,
                volume);
}
