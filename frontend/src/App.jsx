import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Power, Activity, AlertTriangle, Webcam, Settings, Trash2, Zap } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

const socket = io('http://localhost:3001');

function App() {
  const [data, setData] = useState({
    isOn: false,
    conveyorSpeed: 'medium',
    conveyorDirection: 'forward',
    maintenanceMode: false,
    revenue: 0,
    manualServo: { 0: 0, 1: 0, 2: 0, 3: 0 },
    bins: [
      { id: 0, name: "Wet Waste", type: "wet", weight: 0, volume: 0 },
      { id: 1, name: "Dry Waste", type: "dry", weight: 0, volume: 0 },
      { id: 2, name: "Bio-medical", type: "bio", weight: 0, volume: 0 },
      { id: 3, name: "Hazardous", type: "hazard", weight: 0, volume: 0 },
      { id: 4, name: "Metal/E-Waste", type: "metal", weight: 0, volume: 0 }
    ]
  });

  const [alert, setAlert] = useState(null);
  const [camUrl, setCamUrl] = useState(''); // State for IP Camera URL
  const [rotation, setRotation] = useState(0); // State for video rotation
  const [isTorchOn, setIsTorchOn] = useState(false); // State for Torch
  const [aiData, setAiData] = useState({ class: 'Scanning...', confidence: 0, label_id: -1 }); // Real AI Data
  const [boxPos, setBoxPos] = useState({ x: 50, y: 50 }); // Simulated Box Position (%)

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to backend');
    });

    socket.on('system_state', (newState) => {
      setData(newState);
    });

    socket.on('alert', (alertMsg) => {
      setAlert(alertMsg);
      // Auto dismiss warning after 5s
      if (alertMsg.type === 'warning') {
        setTimeout(() => setAlert(null), 5000);
      }
    });

    socket.on('ai_inference', (data) => {
      setAiData(data);
    });

    socket.on('ai_inference', (data) => {
      setAiData(data);
    });

    return () => {
      socket.off('connect');
      socket.off('system_state');
      socket.off('alert');
      socket.off('ai_inference');
    };
  }, []);

  // Simulate "Smart" Box Movement
  useEffect(() => {
    if (!camUrl) return;
    const interval = setInterval(() => {
      setBoxPos(prev => {
        // If high confidence, "Lock On" (stay near center/target with small jitter)
        if (aiData.confidence > 80) {
          return {
            x: 50 + (Math.random() * 10 - 5), // 45-55%
            y: 50 + (Math.random() * 10 - 5)
          };
        } else {
          // If low confidence, "Search" (move widely)
          return {
            x: 20 + Math.random() * 60, // 20-80%
            y: 20 + Math.random() * 60
          };
        }
      });
    }, 800); // Move every 0.8s
    return () => clearInterval(interval);
  }, [camUrl, aiData.confidence]);

  const togglePower = () => {
    socket.emit('toggle_power', !data.isOn);
  };

  const setSpeed = (speed) => {
    socket.emit('set_speed', speed);
  };

  const toggleDirection = (dir) => {
    socket.emit('toggle_direction', dir);
  };

  const setServo = (id, angle) => {
    socket.emit('set_servo', { id, angle });
  };

  return (
    <div className="min-h-screen text-white bg-slate-900 font-sans p-6">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 pb-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500 rounded-lg shadow-lg shadow-green-500/20">
            <Trash2 size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Smart Waste Management</h1>
        </div>

        <div className="flex items-center gap-6">
          {/* Status Indicator */}
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-full border border-slate-700">
            <div className={clsx("w-3 h-3 rounded-full animate-pulse", data.isOn ? "bg-green-500" : "bg-red-500")} />
            <span className="text-sm font-medium text-slate-300">{data.isOn ? "SYSTEM ACTIVE" : "SYSTEM OFFLINE"}</span>
          </div>

          <button
            onClick={togglePower}
            className={clsx(
              "p-3 rounded-full transition-all duration-300 shadow-lg",
              data.isOn
                ? "bg-red-500 hover:bg-red-600 shadow-red-500/30"
                : "bg-green-500 hover:bg-green-600 shadow-green-500/30"
            )}
          >
            <Power size={24} />
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Camera Only */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Camera Feed */}
          <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 shadow-xl relative overflow-hidden h-[500px]">
            <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2">
              <Webcam size={16} className="text-red-500 animate-pulse" />
              <span className="text-xs font-medium text-white">LIVE FEED</span>
            </div>

            <div className="w-full h-full bg-black rounded-xl flex items-center justify-center relative group">
              {camUrl ? (
                <>
                  <img
                    src={`${camUrl}/video`}
                    alt="Live Feed"
                    className="w-full h-full object-cover transition-transform duration-300"
                    style={{ transform: `rotate(${rotation}deg)` }}
                    onError={() => setCamUrl('')}
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      onClick={() => {
                        const mode = !isTorchOn ? 'enabletorch' : 'disabletorch';
                        fetch(`${camUrl}/${mode}`, { mode: 'no-cors' })
                          .then(() => setIsTorchOn(!isTorchOn))
                          .catch(err => console.error("Torch error", err));
                      }}
                      className={clsx("p-2 rounded-full text-white transition-opacity", isTorchOn ? "bg-yellow-500 hover:bg-yellow-600" : "bg-black/50 hover:bg-yellow-500 opacity-0 group-hover:opacity-100")}
                      title="Toggle Torch"
                    >
                      <Zap size={16} className={isTorchOn ? "fill-white" : ""} />
                    </button>
                    <button
                      onClick={() => setRotation(r => (r + 90) % 360)}
                      className="p-2 bg-black/50 hover:bg-blue-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Rotate Video"
                    >
                      <Settings size={16} className="rotate-45" />
                    </button>
                    <button
                      onClick={() => setCamUrl('')}
                      className="p-2 bg-black/50 hover:bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Disconnect Camera"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 w-full max-w-sm">
                  <p className="text-slate-400 mb-4">Enter IP Camera URL from your Phone</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="http://192.168.1.x:8080"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setCamUrl(e.currentTarget.value);
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Example: http://192.168.1.5:8080</p>
                </div>
              )}

              {/* Real AI Bounding Box Overlay */}
              {camUrl && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <motion.div
                    animate={{
                      left: `${boxPos.x}%`,
                      top: `${boxPos.y}%`,
                      scale: [1, 1.05, 1],
                      borderColor: aiData.confidence > 90 ? "#22c55e" : "#eab308"
                    }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 rounded-lg flex flex-col justify-between shadow-[0_0_15px_rgba(0,0,0,0.3)]"
                  >
                    <div className="bg-green-500/90 text-black text-xs font-bold px-2 py-1 self-start flex items-center gap-1">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      {aiData.class.toUpperCase()}
                    </div>
                    <div className="bg-black/60 text-white text-xs px-2 py-1 self-end backdrop-blur-md font-mono">
                      CONF: {aiData.confidence.toFixed(1)}%
                    </div>
                  </motion.div>
                </div>
              )}

              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {/* Bounding boxes could be overlaid here if coordinates are sent via WS */}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Controls & Bins Mockup/List */}
        <div className="flex flex-col gap-6">
          {/* Control Panel */}
          {/* Control Panel: Speed & Maintenance */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl flex flex-col gap-6">

            {/* Speed Controls */}
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold mb-3 text-slate-400 uppercase tracking-wider">
                <Settings size={16} /> Conveyor Speed
              </h2>
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900/50 rounded-xl">
                {['slow', 'medium', 'fast'].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setSpeed(speed)}
                    className={clsx(
                      "py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all",
                      data.conveyorSpeed === speed
                        ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    {speed}
                  </button>
                ))}
              </div>
            </div>

            {/* Maintenance & Direction */}
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold mb-3 text-slate-400 uppercase tracking-wider">
                Maintenance Mode
              </h2>
              <button
                onClick={() => toggleDirection(data.conveyorDirection === 'forward' ? 'reverse' : 'forward')}
                className={clsx("w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                  data.conveyorDirection === 'reverse' ? "bg-amber-500 text-black animate-pulse" : "bg-slate-700 hover:bg-slate-600"
                )}
              >
                <Settings size={18} className={data.conveyorDirection === 'reverse' ? "animate-spin" : ""} />
                {data.conveyorDirection === 'reverse' ? "⚠️ REVERSING BELT" : "Reverse Direction"}
              </button>
            </div>

            {/* Manual Servos */}
            <div>
              <h2 className="text-sm font-semibold mb-3 text-slate-400 uppercase tracking-wider">
                Manual Servo Control
              </h2>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map(id => (
                  <div key={id} className="flex flex-col items-center gap-1 bg-slate-900/30 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-500 font-mono">S{id + 1}</span>
                    <input
                      type="range" min="0" max="90"
                      value={data.manualServo?.[id] || 0}
                      onChange={(e) => setServo(id, parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Metrics Summary */}
          <div className="grid grid-cols-2 gap-4">
            {/* Total Processed */}
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total Processed</p>
              <p className="text-2xl font-bold text-white">1,245 <span className="text-sm font-normal text-slate-500">Items</span></p>
            </div>

            {/* Revenue Card (New) */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-800 p-4 rounded-2xl shadow-lg relative overflow-hidden border border-emerald-500/30">
              <div className="relative z-10">
                <p className="text-emerald-100/80 text-xs uppercase tracking-wider mb-1">Est. Revenue</p>
                <p className="text-2xl font-bold text-white">${data.revenue?.toFixed(2)}</p>
              </div>
              <Activity className="absolute -right-4 -bottom-4 text-white/10 w-24 h-24 rotate-12" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Bins */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Activity size={20} className="text-purple-400" />
          Bin Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {data.bins.map((bin) => {
            const fillPercentage = Math.min(bin.volume, 100);
            const isCritical = fillPercentage >= 90;

            return (
              <div key={bin.id} className="bg-slate-800 rounded-2xl p-5 border border-slate-700 hover:border-slate-600 transition-colors group relative overflow-hidden">
                {/* Progress Bar Background */}
                <div
                  className={clsx("absolute bottom-0 left-0 w-full bg-gradient-to-t opacity-10 transition-all duration-1000",
                    bin.type === 'bio' ? "from-green-500 to-transparent" :
                      bin.type === 'hazard' ? "from-red-500 to-transparent" :
                        bin.type === 'wet' ? "from-blue-500 to-transparent" : "from-yellow-500 to-transparent"
                  )}
                  style={{ height: `${fillPercentage}%` }}
                />

                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <h3 className="font-semibold text-lg">{bin.name}</h3>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">{bin.type} Waste</p>
                  </div>
                  <div className={clsx("w-2 h-2 rounded-full", bin.id === 2 ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-slate-600")} title={bin.id === 2 ? "Sensor Active" : "Simulated"} />
                </div>

                <div className="flex items-end gap-1 mb-2 relative z-10">
                  <span className="text-4xl font-bold">{fillPercentage.toFixed(1)}</span>
                  <span className="text-sm text-slate-400 mb-1">%</span>
                </div>

                {/* Gauge Bar */}
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-4 relative z-10">
                  <motion.div
                    className={clsx("h-full rounded-full",
                      fillPercentage >= 90 ? "bg-red-500 animate-pulse" :
                        bin.type === 'bio' ? "bg-green-400" :
                          bin.type === 'hazard' ? "bg-red-400" :
                            bin.type === 'wet' ? "bg-blue-400" : "bg-yellow-400"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${fillPercentage}%` }}
                    transition={{ type: "spring", stiffness: 50 }}
                  />
                </div>

                <div className="flex justify-between text-sm text-slate-400 relative z-10">
                  <span>{bin.weight.toFixed(2)} kg</span>
                  <span>Max: 20kg</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alert Overlay */}
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={clsx(
              "fixed bottom-8 right-8 p-6 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm z-50 border",
              alert.type === 'critical' ? "bg-red-900/90 border-red-500 text-white" : "bg-amber-900/90 border-amber-500 text-white"
            )}
          >
            <AlertTriangle size={32} className={alert.type === 'critical' ? "text-red-200" : "text-amber-200"} />
            <div>
              <h4 className="font-bold text-lg">{alert.type === 'critical' ? 'CRITICAL ALERT' : 'Warning'}</h4>
              <p className="text-sm opacity-90">{alert.message}</p>
            </div>
            {alert.type === 'critical' && (
              <button
                onClick={() => setAlert(null)}
                className="ml-auto p-2 hover:bg-white/10 rounded-full"
              >
                ✕
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
}

export default App;
