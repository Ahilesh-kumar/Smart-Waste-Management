const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
require('dotenv').config();

const logger = require('./services/logger');
const { initSocket } = require('./services/socketService');
const { startSimulation } = require('./services/simulationService');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for now
        methods: ["GET", "POST"]
    }
});

// Initialize Socket Service
const broadcastState = initSocket(io);

// Start Simulation Service
startSimulation(broadcastState);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});
