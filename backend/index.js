const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Load dotenv safely
try {
    require('dotenv').config();
} catch (e) {
    console.log('dotenv not configured, using environment variables');
}

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint for Render
app.get('/health', (req, res) => res.status(200).send('OK'));

// Serve frontend static files in production
const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
    console.log('Serving static files from:', publicPath);
}

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    // Optimize for low latency
    transports: ['websocket', 'polling'],
    pingTimeout: 5000,
    pingInterval: 2000
});

// Load services with error handling
let logger, initSocket, startSimulation;

try {
    logger = require('./services/logger');
    console.log('Logger loaded successfully');
} catch (e) {
    console.error('Failed to load logger:', e.message);
    logger = { info: console.log, error: console.error, debug: console.log, warn: console.warn };
}

try {
    const socketService = require('./services/socketService');
    initSocket = socketService.initSocket;
    console.log('Socket service loaded successfully');
} catch (e) {
    console.error('Failed to load socket service:', e.message);
    initSocket = () => () => { };
}

try {
    const simService = require('./services/simulationService');
    startSimulation = simService.startSimulation;
    console.log('Simulation service loaded successfully');
} catch (e) {
    console.error('Failed to load simulation service:', e.message);
    startSimulation = () => { };
}

// Initialize Socket Service
const broadcastState = initSocket(io);

// Start Simulation Service
startSimulation(broadcastState);

// SPA fallback - must be AFTER socket.io is initialized
const indexPath = path.join(publicPath, 'index.html');
if (fs.existsSync(indexPath)) {
    // Use regex to match all routes (fixes Express 5 'Missing parameter name' error)
    app.get(/.*/, (req, res) => {
        res.sendFile(indexPath);
    });
    console.log('SPA fallback enabled');
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    if (logger && logger.info) {
        logger.info(`Server running on port ${PORT}`);
    }
});

// Error handling
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
