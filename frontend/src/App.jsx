import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Power, Activity, AlertTriangle, Webcam, Settings, Trash2, Zap, Sun, Moon, TrendingUp, BarChart2, PieChart } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ZAxis } from 'recharts';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

const socket = io('http://localhost:3001');

// --- Graph Enhancement Components ---
const binColors = {
  0: { main: '#06b6d4', gradient: ['#06b6d4', '#0891b2'] }, // Wet (Cyan)
  1: { main: '#f59e0b', gradient: ['#f59e0b', '#d97706'] }, // Dry (Amber)
  2: { main: '#10b981', gradient: ['#10b981', '#059669'] }, // Bio (Emerald)
  3: { main: '#f43f5e', gradient: ['#f43f5e', '#e11d48'] }  // Hazard (Rose)
};

const CustomTooltip = ({ active, payload, label, theme, binId }) => {
  if (active && payload && payload.length) {
    const color = binColors[binId]?.main || '#8884d8';
    return (
      <div className={clsx(
        "p-4 rounded-xl border backdrop-blur-md shadow-2xl",
        theme === 'dark' ? "bg-slate-800/80 border-slate-700 text-white" : "bg-white/80 border-white/50 text-slate-800"
      )}>
        <p className="font-mono text-xs opacity-70 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-bold text-sm">{entry.name}:</span>
            <span className="font-mono text-sm">{entry.value}</span>
            {entry.name === 'Volume' && <span className="text-xs opacity-70">%</span>}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

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
      { id: 3, name: "Hazardous", type: "hazard", weight: 0, volume: 0 }
    ]
  });

  const [alert, setAlert] = useState(null);
  const [camUrl, setCamUrl] = useState(''); // State for IP Camera URL
  const [rotation, setRotation] = useState(0); // State for video rotation
  const [isTorchOn, setIsTorchOn] = useState(false); // State for Torch
  const [aiData, setAiData] = useState({ class: 'Scanning...', confidence: 0, label_id: -1 }); // Real AI Data
  const [boxPos, setBoxPos] = useState({ x: 50, y: 50 }); // Simulated Box Position (%)

  const [history, setHistory] = useState([]);
  const [theme, setTheme] = useState('dark');
  const [graphType, setGraphType] = useState('line');
  const [selectedBin, setSelectedBin] = useState(null);

  const toggleTheme = () => {
    playClick();
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Sound Effect Logic
  const playClick = () => {
    const audio = new AudioContext();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.frequency.setValueAtTime(800, audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, audio.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audio.currentTime + 0.1);
    osc.start();
    osc.stop(audio.currentTime + 0.1);
  };

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to backend');
    });

    socket.on('system_state', (newState) => {
      // Preserve local state if needed, but we rely on backend for single source
      setData(newState);

      // Update Graph History logic...
      setHistory(prev => {
        const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const newPoint = {
          time: now,
          // General Volume
          wet: newState.bins[0].volume,
          dry: newState.bins[1].volume,
          bio: newState.bins[2].volume,
          hazard: newState.bins[3].volume,
          // Individual Bin Details (we can filter from this history in the modal)
          bin0_vol: newState.bins[0].volume, bin0_items: newState.bins[0].itemsCount || 0,
          bin1_vol: newState.bins[1].volume, bin1_items: newState.bins[1].itemsCount || 0,
          bin2_vol: newState.bins[2].volume, bin2_items: newState.bins[2].itemsCount || 0,
          bin3_vol: newState.bins[3].volume, bin3_items: newState.bins[3].itemsCount || 0,
          // AI Confidence History (Mocking it for now or pulling from last aiData)
          ai_confidence: newState.latestAiConfidence || 0 // Assuming backend might send this or we use local
        };
        const newHistory = [...prev, newPoint];
        if (newHistory.length > 50) return newHistory.slice(1); // Keep last 50 for detail graphs
        return newHistory;
      });
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
      // Small hack: Append confidence to history immediately for better resolution
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
    playClick();
    socket.emit('toggle_power', !data.isOn);
  };

  const setSpeed = (speed) => {
    playClick();
    socket.emit('set_speed', speed);
  };

  const toggleDirection = (dir) => {
    playClick();
    socket.emit('toggle_direction', dir);
  };

  const setServo = (id, angle) => {
    // No click sound for slider drag (too spammy)
    socket.emit('set_servo', { id, angle });
  };

  return (
    <div className={clsx(
      "min-h-screen font-sans p-6 transition-all duration-700",
      theme === 'dark' ? "animate-mesh-dark text-slate-100" : "animate-mesh-light text-slate-800"
    )}>
      {/* Header */}
      <header className={clsx(
        "flex justify-between items-center mb-8 pb-4 border-b transition-all duration-300",
        theme === 'dark' ? "border-slate-700" : "border-slate-300"
      )}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl shadow-lg shadow-green-500/20">
            <Trash2 size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Smart Waste Management</h1>
            <p className={clsx("text-xs font-medium uppercase tracking-widest", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>
              Dashboard Control Center
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Status Indicator */}
          <div className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md shadow-sm transition-all border",
            theme === 'dark' ? "bg-black/20 border-white/10" : "bg-white/30 border-white/40"
          )}>
            <div className={clsx("w-3 h-3 rounded-full animate-pulse", data.isOn ? "bg-green-500" : "bg-red-500")} />
            <span className={clsx("text-sm font-bold", theme === 'dark' ? "text-slate-300" : "text-slate-600")}>
              {data.isOn ? "SYSTEM ACTIVE" : "SYSTEM OFFLINE"}
            </span>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={clsx(
              "p-3 rounded-full transition-all duration-300 shadow-lg border",
              theme === 'dark' ? "bg-white/10 border-white/10 hover:bg-white/20" : "bg-white/40 border-white/40 hover:bg-white/60"
            )}
          >
            {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
          </button>

          <button
            onClick={togglePower}
            className={clsx(
              "p-3 rounded-full transition-all duration-300 shadow-lg",
              data.isOn
                ? "bg-red-500 hover:bg-red-600 shadow-red-500/30"
                : "bg-green-500 hover:bg-green-600 shadow-green-500/30"
            )}
          >
            <Power size={24} className="text-white" />
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Camera Only */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Camera Feed */}
          <div className={clsx(
            "rounded-3xl p-1 relative overflow-hidden h-[500px] transition-all duration-500 group",
            theme === 'dark' ? "glass-panel-dark" : "glass-panel-light"
          )}>
            <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 border border-white/10">
              <Webcam size={16} className="text-red-500 animate-pulse" />
              <span className="text-xs font-bold text-white tracking-wider">LIVE CAM 1</span>
            </div>

            <div className="w-full h-full rounded-2xl overflow-hidden relative bg-black/5 flex items-center justify-center">
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
                        playClick();
                        const mode = !isTorchOn ? 'enabletorch' : 'disabletorch';
                        fetch(`${camUrl}/${mode}`, { mode: 'no-cors' })
                          .then(() => setIsTorchOn(!isTorchOn))
                          .catch(err => console.error("Torch error", err));
                      }}
                      className={clsx("p-2 rounded-full text-white transition-opacity backdrop-blur-md border border-white/20", isTorchOn ? "bg-yellow-500/90 hover:bg-yellow-600" : "bg-black/40 hover:bg-yellow-500 opacity-0 group-hover:opacity-100")}
                      title="Toggle Torch"
                    >
                      <Zap size={16} className={isTorchOn ? "fill-white" : ""} />
                    </button>
                    <button
                      onClick={() => { playClick(); setRotation(r => (r + 90) % 360); }}
                      className="p-2 bg-black/40 backdrop-blur-md border border-white/20 hover:bg-blue-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Rotate Video"
                    >
                      <Settings size={16} className="rotate-45" />
                    </button>
                    <button
                      onClick={() => { playClick(); setCamUrl(''); }}
                      className="p-2 bg-black/40 backdrop-blur-md border border-white/20 hover:bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Disconnect Camera"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 w-full max-w-sm relative z-10">
                  <div className={clsx("w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6", theme === 'dark' ? "bg-slate-800 text-slate-600" : "bg-slate-200 text-slate-400")}>
                    <Webcam size={40} />
                  </div>
                  <h3 className={clsx("text-lg font-bold mb-2", theme === 'dark' ? "text-white" : "text-slate-800")}>Connect IP Camera</h3>
                  <p className={clsx("mb-6 text-sm", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>Enter the IP address shown on your IP Webcam app to view the live feed.</p>

                  <div className="flex gap-2 relative">
                    <input
                      type="text"
                      placeholder="http://192.168.1.x:8080"
                      className={clsx(
                        "flex-1 rounded-xl px-4 py-3 text-sm focus:outline-none border transition-all",
                        theme === 'dark'
                          ? "bg-slate-900/80 border-slate-700 text-white focus:border-blue-500"
                          : "bg-white border-slate-300 text-slate-800 focus:border-blue-500 shadow-inner"
                      )}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setCamUrl(e.currentTarget.value);
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-3 font-mono">Example: http://192.168.1.5:8080</p>
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
            </div>
          </div>
        </div>

        {/* Right Column: Controls & Bins Mockup/List */}
        <div className="flex flex-col gap-6">
          {/* Control Panel: Speed & Maintenance */}
          <div className={clsx(
            "flex flex-col gap-6 rounded-3xl p-6 transition-all duration-500",
            theme === 'dark' ? "glass-panel-dark" : "glass-panel-light"
          )}>

            {/* Speed Controls */}
            <div>
              <h2 className={clsx("flex items-center gap-2 text-sm font-bold mb-3 uppercase tracking-wider", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>
                <Settings size={16} /> Conveyor Speed
              </h2>
              <div className={clsx("grid grid-cols-3 gap-2 p-1 rounded-xl", theme === 'dark' ? "bg-slate-900/50" : "bg-slate-200/50")}>
                {['slow', 'medium', 'fast'].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setSpeed(speed)}
                    className={clsx(
                      "py-2 rounded-lg text-sm font-medium transition-all duration-300 capitalize relative overflow-hidden",
                      data.conveyorSpeed === speed
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                        : theme === 'dark' ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    )}
                  >
                    {speed}
                  </button>
                ))}
              </div>
            </div>

            {/* Maintenance Mode */}
            <div>
              <h2 className={clsx("text-sm font-bold mb-3 uppercase tracking-wider", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>Maintenance Mode</h2>
              <button
                onClick={() => toggleDirection(data.conveyorDirection === 'forward' ? 'reverse' : 'forward')}
                className={clsx(
                  "w-full py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 border font-semibold",
                  data.conveyorDirection === 'reverse'
                    ? "bg-amber-500/10 border-amber-500/50 text-amber-500"
                    : theme === 'dark' ? "bg-slate-700/50 border-transparent hover:bg-slate-700 text-slate-300" : "bg-slate-100 border-transparent hover:bg-slate-200 text-slate-600"
                )}
              >
                <Settings size={18} className={data.conveyorDirection === 'reverse' ? "animate-spin-slow" : ""} />
                {data.conveyorDirection === 'reverse' ? "Reversing..." : "Reverse Direction"}
              </button>
            </div>

            {/* Manual Servo Control */}
            <div>
              <h2 className={clsx("text-sm font-bold mb-3 uppercase tracking-wider", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>Manual Servo Control</h2>
              <div className="grid grid-cols-4 gap-4">
                {[0, 1, 2, 3].map(id => (
                  <div key={id} className="flex flex-col items-center gap-2">
                    <div className="h-24 w-2 bg-slate-700/30 rounded-full relative">
                      <div
                        className="absolute bottom-0 left-0 w-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ height: `${(data.manualServo[id] / 90) * 100}%` }}
                      />
                      <input
                        type="range" min="0" max="90"
                        value={data.manualServo[id]}
                        onChange={(e) => setServo(id, parseInt(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        orient="vertical"
                      />
                    </div>
                    <span className={clsx("text-xs font-mono", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>S{id + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Metrics Summary */}
          <div className="grid grid-cols-2 gap-4">
            {/* Total Processed */}
            <div className={clsx(
              "p-6 rounded-3xl transition-all duration-500",
              theme === 'dark' ? "glass-panel-dark" : "glass-panel-light hover-float"
            )}>
              <p className={clsx("text-xs uppercase tracking-wider mb-1", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>Total Processed</p>
              <p className={clsx("text-3xl font-black", theme === 'dark' ? "text-white" : "text-slate-800")}>1,245 <span className={clsx("text-sm font-normal", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>Items</span></p>
            </div>

            {/* Revenue Card (New) */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-6 rounded-3xl shadow-xl shadow-emerald-500/20 relative overflow-hidden border border-white/10 group">
              <div className="relative z-10 transition-transform duration-500 group-hover:-translate-y-1">
                <p className="text-emerald-100/90 text-xs uppercase tracking-wider mb-1 font-medium">Est. Revenue</p>
                <p className="text-3xl font-black text-white">${data.revenue?.toFixed(2)}</p>
              </div>
              <Activity className="absolute -right-4 -bottom-4 text-white/10 w-28 h-28 rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6" />
            </div>
          </div>



        </div>
      </div>

      {/* Bottom Row: Bins */}
      <div className="mt-8">
        <h2 className={clsx("text-3xl font-black mb-6 flex items-center gap-3 tracking-tight", theme === 'dark' ? "text-white" : "text-slate-800")}>
          <Activity size={28} className="text-purple-500" />
          Bin Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.bins.map((bin) => {
            const fillPercentage = Math.min(bin.volume, 100);

            return (
              <motion.div
                layoutId={`bin-${bin.id}`}
                key={bin.id}
                onClick={() => {
                  playClick();
                  setSelectedBin(bin.id);
                }}
                whileHover={{ y: -5, scale: 1.02 }}
                className={clsx(
                  "p-6 rounded-3xl cursor-pointer relative overflow-hidden group transition-all duration-300 border",
                  theme === 'dark'
                    ? "glass-panel-dark hover:shadow-2xl hover:shadow-purple-500/20"
                    : "glass-panel-light hover:shadow-xl hover:shadow-blue-500/20"
                )}
              >
                {/* Progress Bar Background */}
                <div
                  className={clsx("absolute bottom-0 left-0 w-full transition-all duration-1000 opacity-20",
                    bin.type === 'bio' ? "bg-green-500" :
                      bin.type === 'hazard' ? "bg-red-500" :
                        bin.type === 'wet' ? "bg-blue-500" : "bg-yellow-500"
                  )}
                  style={{ height: `${fillPercentage}%` }}
                />

                {/* Header */}
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <h3 className={clsx("text-lg font-bold leading-none", theme === 'dark' ? "text-white" : "text-slate-800")}>{bin.name}</h3>
                  </div>
                  <div className={clsx("w-2 h-2 rounded-full", fillPercentage > 90 ? "bg-red-500 animate-ping" : "bg-slate-600/30")}></div>
                </div>

                <div className="flex items-end gap-1 mb-2 relative z-10">
                  <span className={clsx("text-4xl font-black", theme === 'dark' ? "text-white" : "text-slate-800")}>{fillPercentage.toFixed(1)}</span>
                  <span className={clsx("text-sm font-medium mb-1", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>%</span>
                </div>

                {/* Gauge Bar */}
                <div className={clsx("w-full h-2 rounded-full overflow-hidden mb-4 relative z-10", theme === 'dark' ? "bg-slate-700/50" : "bg-slate-200")}>
                  <motion.div
                    className={clsx("h-full rounded-full shadow-lg",
                      fillPercentage >= 90 ? "bg-red-500 animate-pulse" :
                        bin.type === 'bio' ? "bg-green-500" :
                          bin.type === 'hazard' ? "bg-red-500" :
                            bin.type === 'wet' ? "bg-blue-500" : "bg-yellow-500"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${fillPercentage}%` }}
                    transition={{ type: "spring", stiffness: 50 }}
                  />
                </div>

                <div className={clsx("flex justify-between text-xs font-mono relative z-10", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                  <span>{bin.weight.toFixed(2)} kg</span>
                  <span>Max: 20kg</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bin Detail Modal */}
      <AnimatePresence>
        {selectedBin !== null && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className={clsx("w-full max-w-4xl rounded-3xl overflow-hidden max-h-[90vh] flex flex-col", theme === 'dark' ? "glass-panel-dark" : "glass-panel-light")}
            >
              <div className={clsx("p-6 border-b flex justify-between items-center", theme === 'dark' ? "border-white/10 bg-white/5" : "border-black/5 bg-white/40")}>
                <div>
                  <h2 className={clsx("text-2xl font-bold", theme === 'dark' ? "text-white" : "text-slate-800")}>
                    {data.bins.find(b => b.id === selectedBin)?.name} Analysis
                  </h2>
                  <p className={clsx("text-sm", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>
                    Real-time Volume & Item Processing Data
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBin(null)}
                  className="p-2 rounded-full hover:bg-red-500/20 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="rotate-45" size={24} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto grid grid-cols-1 gap-8">
                {/* Chart 1: Volume vs Time (Cartesian Area) */}
                <div>
                  <h3 className={clsx("text-sm font-bold uppercase tracking-wider mb-4 border-l-4 pl-3", theme === 'dark' ? "border-slate-600 text-slate-400" : "border-slate-300 text-slate-500")}>Volume Analysis</h3>
                  <div className={clsx("h-64 w-full rounded-xl p-2", theme === 'dark' ? "bg-black/10" : "bg-slate-100/50")}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history}>
                        <defs>
                          <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={binColors[selectedBin]?.main} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={binColors[selectedBin]?.main} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip theme={theme} binId={selectedBin} />} />
                        <ReferenceLine y={90} label="CRITICAL" stroke="red" strokeDasharray="3 3" />
                        <Area
                          type="monotone"
                          dataKey={`bin${selectedBin}_vol`}
                          stroke={binColors[selectedBin]?.main}
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#splitColor)"
                          name="Volume"
                          animationDuration={500}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Chart 2: Items vs Time (Bar Graph) */}
                  <div>
                    <h3 className={clsx("text-sm font-bold uppercase tracking-wider mb-4 border-l-4 pl-3", theme === 'dark' ? "border-slate-600 text-slate-400" : "border-slate-300 text-slate-500")}>Items Processed</h3>
                    <div className={clsx("h-48 w-full rounded-xl p-2", theme === 'dark' ? "bg-black/10" : "bg-slate-100/50")}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={history}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                          <XAxis dataKey="time" hide />
                          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <Tooltip content={<CustomTooltip theme={theme} binId={selectedBin} />} />
                          <Bar
                            dataKey={`bin${selectedBin}_items`}
                            fill={binColors[selectedBin]?.main}
                            radius={[4, 4, 0, 0]}
                            name="Items Count"
                            animationDuration={500}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 3: Bin Health (Radar) [NEW] */}
                  <div>
                    <h3 className={clsx("text-sm font-bold uppercase tracking-wider mb-4 border-l-4 pl-3", theme === 'dark' ? "border-slate-600 text-slate-400" : "border-slate-300 text-slate-500")}>System Health</h3>
                    <div className={clsx("h-48 w-full rounded-xl p-2 flex items-center justify-center", theme === 'dark' ? "bg-black/10" : "bg-slate-100/50")}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                          { subject: 'Sensor', A: data.bins[selectedBin]?.health?.sensor || 100, fullMark: 100 },
                          { subject: 'Battery', A: data.bins[selectedBin]?.health?.battery || 100, fullMark: 100 },
                          { subject: 'Connect', A: data.bins[selectedBin]?.health?.signal || 100, fullMark: 100 },
                          { subject: 'Motor', A: data.bins[selectedBin]?.health?.motor || 100, fullMark: 100 },
                          { subject: 'Clean', A: data.bins[selectedBin]?.health?.clean || 100, fullMark: 100 },
                        ]}>
                          <PolarGrid stroke={theme === 'dark' ? '#334155' : '#cbd5e1'} />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar
                            name="Status"
                            dataKey="A"
                            stroke={binColors[selectedBin]?.main}
                            fill={binColors[selectedBin]?.main}
                            fillOpacity={0.3}
                          />
                          <Tooltip content={<CustomTooltip theme={theme} binId={selectedBin} />} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Chart 4: AI Confidence (Scatter) [NEW] */}
                <div>
                  <h3 className={clsx("text-sm font-bold uppercase tracking-wider mb-4 border-l-4 pl-3", theme === 'dark' ? "border-slate-600 text-slate-400" : "border-slate-300 text-slate-500")}>AI Performance (Last 50 Scans)</h3>
                  <div className={clsx("h-40 w-full rounded-xl p-2", theme === 'dark' ? "bg-black/10" : "bg-slate-100/50")}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                        <XAxis type="category" dataKey="time" name="Time" hide />
                        <YAxis type="number" dataKey="ai_confidence" name="Confidence" unit="%" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip theme={theme} binId={selectedBin} />} />
                        <Scatter name="AI Confidence" data={history} fill={binColors[selectedBin]?.main} line={{ stroke: binColors[selectedBin]?.main, strokeWidth: 1 }} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
    </div>
  );
}

export default App;
