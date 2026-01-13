const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for now (Dashboard + ESP32)
        methods: ["GET", "POST"]
    }
});

// System State
let systemState = {
    isOn: false,
    conveyorSpeed: "medium", // slow, medium, fast
    conveyorDirection: "forward", // forward, reverse
    maintenanceMode: false,
    revenue: 125.50, // Fake accumulated revenue
    manualServo: { 0: 0, 1: 0, 2: 0, 3: 0 }, // Servo angles
    bins: [
        { id: 0, name: "Wet Waste", type: "wet", weight: 0, volume: 0, isSimulated: false },
        { id: 1, name: "Dry Waste", type: "dry", weight: 0, volume: 0, isSimulated: true },
        { id: 2, name: "Bio-medical", type: "bio", weight: 0, volume: 0, isSimulated: false },
        { id: 3, name: "Hazardous", type: "hazard", weight: 0, volume: 0, isSimulated: true },
        { id: 4, name: "Metal/E-Waste", type: "metal", weight: 0, volume: 0, isSimulated: true } // New 5th Category
    ]
};

// User mapping: 0=Wet, 1=Dry, 2=Bio, 3=Hazard.
// So Bin Index 2 is the REAL one.

// Constants for Limits
const MAX_WEIGHT_KG = 20; // Example max weight
const LIMIT_WARNING = 90; // %
const LIMIT_STOP = 100; // %

// Helper to broadcast state
const broadcastState = () => {
    io.emit('system_state', systemState);
};

// Simulation Loop for Fake Bins (1, 3 - waiting for 0,1,3 mapping)
// The user said: "All other 3 should have fake value but not reach 90%"
// We will simulate gentle increases over time if System is ON.
// Simulation Loop
setInterval(() => {
    if (systemState.isOn) {
        // Simulate Revenue Increase (Recyclables sourced)
        if (Math.random() > 0.5) {
            systemState.revenue += (Math.random() * 2); // Add $0.5 - $2.5 randomly
            systemState.revenue = parseFloat(systemState.revenue.toFixed(2));
        }

        systemState.bins.forEach((bin, index) => {
            if (index !== 2) { // Skip Bio bin (Real)
                // Simulate random increase for all others including Metal
                if (Math.random() > 0.7) {
                    const increase = Math.random() * 0.5;
                    let newVol = bin.volume + increase;
                    if (newVol > 85) newVol = 85;
                    bin.volume = parseFloat(newVol.toFixed(1));

                    let newWeight = bin.weight + (increase * 0.2);
                    bin.weight = parseFloat(newWeight.toFixed(2));
                }
            }
        });
        broadcastState();
    }
}, 3000); // Every 3 seconds

io.on('connection', (socket) => {
    console.log('Use connected:', socket.id);

    // Send initial state
    socket.emit('system_state', systemState);

    // --- EVENTS FROM DASHBOARD ---

    socket.on('toggle_power', (isOn) => {
        console.log(`System Power: ${isOn}`);
        systemState.isOn = isOn;
        broadcastState();
        // Forward to ESP32 (if it's listening on a specific topic/event)
        io.emit('esp_control', { command: 'power', value: isOn });
    });

    socket.on('set_speed', (speed) => {
        // speed: 'slow', 'medium', 'fast'
        console.log(`Set Speed: ${speed}`);
        systemState.conveyorSpeed = speed;
        broadcastState();
        io.emit('esp_control', { command: 'speed', value: speed });
    });

    socket.on('toggle_direction', (dir) => {
        console.log(`Set Direction: ${dir}`);
        systemState.conveyorDirection = dir;
        broadcastState();
        io.emit('esp_control', { command: 'direction', value: dir });
    });

    socket.on('set_servo', (data) => {
        // { id: 0, angle: 90 }
        console.log(`Servo ${data.id} -> ${data.angle}`);
        systemState.manualServo[data.id] = data.angle;
        broadcastState(); // Reflect in UI
        io.emit('esp_control', { command: 'servo', id: data.id, value: data.angle });
    });

    // AI Inference Relay
    socket.on('ai_inference', (data) => {
        // data: { class: "1 Dry", confidence: 98.2, label_id: 1 }
        io.emit('ai_inference', data);
    });

    // --- EVENTS FROM ESP32 (Master) ---

    // 1. Classification Event (Item fell into bin)
    socket.on('item_sorted', (data) => {
        // data: { type: 0|1|2|3 }
        const typeIdx = parseInt(data.type);
        if (typeIdx >= 0 && typeIdx < 4) {
            console.log(`Item sorted into Bin ${typeIdx}`);
            // For simulated bins, we might give a "jump" in values here
            if (typeIdx !== 2) {
                systemState.bins[typeIdx].volume += 2; // Jump 2%
                systemState.bins[typeIdx].weight += 0.5; // Jump 0.5kg
            }
            broadcastState();
        }
    });

    // 2. Real Sensor Data (Only for Bin 2 - Bio)
    socket.on('sensor_data', (data) => {
        // data: { weight: 5.2, volume: 45 }
        // Update Bin 2
        if (systemState.bins[2]) {
            systemState.bins[2].weight = parseFloat(data.weight);
            systemState.bins[2].volume = parseFloat(data.volume);

            // Check Limits
            if (systemState.bins[2].volume >= LIMIT_STOP) {
                io.emit('alert', { type: 'critical', message: 'Bio Bin Full! System Stopping.' });
                systemState.isOn = false; // Force Stop
                io.emit('esp_control', { command: 'power', value: false });
            } else if (systemState.bins[2].volume >= LIMIT_WARNING) {
                io.emit('alert', { type: 'warning', message: 'Bio Bin 90% Full.' });
            }

            broadcastState();
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
