const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const logger = require('./services/logger');
const { initSocket } = require('./services/socketService');
const { startSimulation } = require('./services/simulationService');

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
    }
});

// Initialize Socket Service
const broadcastState = initSocket(io);

// Start Simulation Service
startSimulation(broadcastState);

// SPA fallback - must be AFTER socket.io is initialized
const indexPath = path.join(publicPath, 'index.html');
if (fs.existsSync(indexPath)) {
    app.get('*', (req, res) => {
        res.sendFile(indexPath);
    });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on port ${PORT}`);
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
