const StateStore = require('./stateStore');

let simulationInterval = null;

const startSimulation = (broadcastCallback) => {
    if (simulationInterval) return;

    simulationInterval = setInterval(() => {
        const state = StateStore.getState();

        if (state.isOn) {
            // Updated state object
            let hasChanges = false;
            const updates = { bins: [...state.bins] };

            updates.bins.forEach((bin, index) => {
                // --- Smart Health Simulation ---
                // 1. Battery Drain (Very slow)
                if (Math.random() > 0.95) {
                    bin.health.battery = Math.max(0, bin.health.battery - 0.1);
                    hasChanges = true;
                }

                // 2. Signal Fluctuation (90-100%)
                bin.health.signal = 90 + Math.floor(Math.random() * 10);

                // 3. Sensor Cleanliness
                if (Math.random() > 0.98) {
                    bin.health.clean = Math.max(50, bin.health.clean - 0.1);
                    hasChanges = true;
                }

                // Format values
                bin.health.battery = parseFloat(bin.health.battery.toFixed(1));
                bin.health.clean = parseFloat(bin.health.clean.toFixed(1));

                // NOTE: Item counting is now ONLY handled by ESP32 'item_sorted' events
                // The simulation no longer auto-increments counts
            });

            if (hasChanges || true) { // Always broadcast for signal fluctuation
                StateStore.updateState({ bins: updates.bins });
                broadcastCallback(StateStore.getState());
            }
        }
    }, 3000); // Every 3 seconds
};

const stopSimulation = () => {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
};

module.exports = { startSimulation, stopSimulation };
