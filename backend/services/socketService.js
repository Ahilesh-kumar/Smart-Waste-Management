const StateStore = require('./stateStore');
const logger = require('./logger');

const LIMIT_WARNING = 90;
const LIMIT_STOP = 99;

const initSocket = (io) => {
    // Helper to broadcast state
    const broadcastState = () => {
        io.emit('system_state', StateStore.getState());
    };

    io.on('connection', (socket) => {
        logger.info(`User connected: ${socket.id}`);

        // Send initial state
        socket.emit('system_state', StateStore.getState());

        // --- EVENTS FROM DASHBOARD ---
        socket.on('toggle_power', (isOn) => {
            logger.info(`System Power: ${isOn}`);

            const updates = { isOn };

            // Reset bins if turning ON
            if (isOn) {
                const currentBins = StateStore.getState().bins.map(bin => ({
                    ...bin,
                    volume: 5, // Reset to 5% as requested
                    weight: 0,
                    itemsCount: 0
                }));
                updates.bins = currentBins;
            }

            StateStore.updateState(updates);
            broadcastState();
            io.emit('esp_control', { command: 'power', value: isOn });
        });

        socket.on('set_speed', (speed) => {
            logger.info(`Set Speed: ${speed}`);
            StateStore.updateState({ conveyorSpeed: speed });
            broadcastState();
            io.emit('esp_control', { command: 'speed', value: speed });
        });

        socket.on('toggle_direction', (dir) => {
            logger.info(`Set Direction: ${dir}`);
            StateStore.updateState({ conveyorDirection: dir });
            broadcastState();
            io.emit('esp_control', { command: 'direction', value: dir });
        });

        socket.on('set_servo', (data) => {
            logger.debug(`Servo ${data.id} -> ${data.angle}`);
            const currentServos = StateStore.getState().manualServo;
            currentServos[data.id] = data.angle;
            StateStore.updateState({ manualServo: currentServos });
            broadcastState(); // Reflect in UI
            io.emit('esp_control', { command: 'servo', id: data.id, value: data.angle });
        });

        // AI Inference Relay
        socket.on('ai_inference', (data) => {
            // data: { class: "1 Dry", confidence: 98.2, label_id: 1 }
            io.emit('ai_inference', data);

            // Extract category for logging
            let category = "General";
            if (data.class.includes("Bio")) category = "Bio-medical";
            else if (data.class.includes("Hazard")) category = "Hazardous";
            else if (data.class.includes("Wet")) category = "Wet Waste";
            else if (data.class.includes("Dry")) category = "Dry Waste";

            // Log to DB
            StateStore.addLog({
                time: new Date().toLocaleTimeString(),
                rawClass: data.class,
                category: category,
                confidence: data.confidence
            });
        });

        // --- EVENTS FROM ESP32 (Master) ---
        socket.on('item_sorted', (data) => {
            const typeIdx = parseInt(data.type);
            if (typeIdx >= 0 && typeIdx < 4) {
                logger.info(`Item sorted into Bin ${typeIdx}`);
                const state = StateStore.getState();
                const bin = state.bins[typeIdx];

                const updates = { itemsCount: bin.itemsCount + 1 };
                if (typeIdx !== 2) {
                    updates.volume = parseFloat((bin.volume + 2).toFixed(1));
                    updates.weight = parseFloat((bin.weight + 0.5).toFixed(2));
                }
                StateStore.updateBin(typeIdx, updates);
                broadcastState();
            }
        });

        socket.on('sensor_data', (data) => {
            const state = StateStore.getState();
            if (state.bins[2]) {
                const newWeight = parseFloat(data.weight);
                const newVolume = parseFloat(data.volume);

                StateStore.updateBin(2, { weight: newWeight, volume: newVolume });

                // Check Limits
                if (newVolume >= LIMIT_STOP) {
                    io.emit('alert', { type: 'critical', message: 'Bio Bin Full! System Stopping.' });
                    StateStore.updateState({ isOn: false });
                    io.emit('esp_control', { command: 'power', value: false });
                } else if (newVolume >= LIMIT_WARNING) {
                    io.emit('alert', { type: 'warning', message: 'Bio Bin 90% Full.' });
                }

                broadcastState();
            }
        });

        socket.on('disconnect', () => {
            logger.info(`User disconnected: ${socket.id}`);
        });
    });

    // --- TIME SERIES EMITTER (Every 10 seconds) ---
    setInterval(() => {
        const state = StateStore.getState();
        if (state.isOn) {
            // Log current category counts as a time series point
            StateStore.addTimeSeriesPoint({
                wet: state.bins[0].itemsCount,
                dry: state.bins[1].itemsCount,
                bio: state.bins[2].itemsCount,
                hazard: state.bins[3].itemsCount,
                total: state.bins.reduce((sum, b) => sum + b.itemsCount, 0)
            });

            // Broadcast time series to all clients
            io.emit('timeseries_update', {
                data: StateStore.getTimeSeries(50) // Last 50 points (~8 min)
            });
        }
    }, 10000); // 10 seconds

    return broadcastState;
};

module.exports = { initSocket };
