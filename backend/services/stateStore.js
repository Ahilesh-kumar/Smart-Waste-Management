const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

// Database setup
const adapter = new FileSync('db.json');
const db = low(adapter);

// Initial State Defaults
const defaultState = {
    isOn: false,
    conveyorSpeed: "medium", // slow, medium, fast
    conveyorDirection: "forward", // forward, reverse
    maintenanceMode: false,
    revenue: 125.50,
    manualServo: { 0: 0, 1: 0, 2: 0, 3: 0 },
    bins: [
        { id: 0, name: "Wet Waste", type: "wet", weight: 0, volume: 0, itemsCount: 0, isSimulated: false, health: { battery: 100, signal: 98, motor: 100, sensor: 100, clean: 100 } },
        { id: 1, name: "Dry Waste", type: "dry", weight: 0, volume: 0, itemsCount: 0, isSimulated: true, health: { battery: 95, signal: 96, motor: 98, sensor: 99, clean: 95 } },
        { id: 2, name: "Bio-medical", type: "bio", weight: 0, volume: 0, itemsCount: 0, isSimulated: false, health: { battery: 100, signal: 99, motor: 100, sensor: 100, clean: 100 } },
        { id: 3, name: "Hazardous", type: "hazard", weight: 0, volume: 0, itemsCount: 0, isSimulated: true, health: { battery: 88, signal: 92, motor: 95, sensor: 97, clean: 80 } }
    ]
};

// Log History Defaults
const defaultHistory = {
    logs: [],
    sessions: []
};

// Initialize DB
db.defaults({ systemState: defaultState, history: defaultHistory }).write();

const StateStore = {
    // Get full system state
    getState: () => {
        return db.get('systemState').value();
    },

    // Update specific keys in system state
    updateState: (updates) => {
        const currentState = db.get('systemState').value();
        const newState = { ...currentState, ...updates };
        db.set('systemState', newState).write();
        return newState;
    },

    // Update a specific bin
    updateBin: (binIndex, updates) => {
        const bins = db.get('systemState.bins').value();
        if (bins[binIndex]) {
            const updatedBin = { ...bins[binIndex], ...updates };
            bins[binIndex] = updatedBin;
            db.set('systemState.bins', bins).write();
            return updatedBin;
        }
        return null;
    },

    // Add an event log
    addLog: (logEntry) => {
        db.get('history.logs').push({ ...logEntry, timestamp: new Date().toISOString() }).write();
    },

    // Get stats
    getStats: () => {
        const bins = db.get('systemState.bins').value();
        return {
            totalItems: bins.reduce((acc, bin) => acc + bin.itemsCount, 0),
            bioCount: bins[2].itemsCount
        };
    }
};

module.exports = StateStore;
