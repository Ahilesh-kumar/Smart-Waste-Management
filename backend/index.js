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
        { id: 0, name: "Wet Waste", type: "wet", weight: 0, volume: 0, itemsCount: 0, isSimulated: false, health: { battery: 100, signal: 98, motor: 100, sensor: 100, clean: 100 } },
        { id: 1, name: "Dry Waste", type: "dry", weight: 0, volume: 0, itemsCount: 0, isSimulated: true, health: { battery: 95, signal: 96, motor: 98, sensor: 99, clean: 95 } },
        { id: 2, name: "Bio-medical", type: "bio", weight: 0, volume: 0, itemsCount: 0, isSimulated: false, health: { battery: 100, signal: 99, motor: 100, sensor: 100, clean: 100 } }, // Real bin starts perfect
        { id: 3, name: "Hazardous", type: "hazard", weight: 0, volume: 0, itemsCount: 0, isSimulated: true, health: { battery: 88, signal: 92, motor: 95, sensor: 97, clean: 80 } }
    ]
};

// ... (Constants)

// Helper to broadcast state
const broadcastState = () => {
    io.emit('system_state', systemState);
};

// Simulation Loop
setInterval(() => {
    if (systemState.isOn) {
        // Simulate Revenue
        if (Math.random() > 0.5) {
            systemState.revenue += (Math.random() * 2);
            systemState.revenue = parseFloat(systemState.revenue.toFixed(2));
        }

        systemState.bins.forEach((bin, index) => {
            // --- Smart Health Simulation (For all bins) ---
            // 1. Battery Drain (Very slow)
            if (Math.random() > 0.95) bin.health.battery = Math.max(0, bin.health.battery - 0.1);

            // 2. Signal Fluctuation (90-100%)
            bin.health.signal = 90 + Math.floor(Math.random() * 10);

            // 3. Sensor Cleanliness (Drops slowly)
            if (Math.random() > 0.98) bin.health.clean = Math.max(50, bin.health.clean - 0.1);

            // Format values
            bin.health.battery = parseFloat(bin.health.battery.toFixed(1));
            bin.health.clean = parseFloat(bin.health.clean.toFixed(1));


            if (index !== 2) { // Skip Bio bin (Real Volume/Weight)
                // Simulate random increase for others
                if (Math.random() > 0.7) {
                    const increase = Math.random() * 0.5;
                    let newVol = bin.volume + increase;
                    if (newVol > 85) newVol = 85; // Cap at 85% for sim

                    if (newVol > bin.volume) {
                        bin.itemsCount += 1; // Increment items count on volume increase
                    }
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

            // Increment Item Count for ALL bins (Real & Simulated)
            systemState.bins[typeIdx].itemsCount += 1;

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
