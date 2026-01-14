import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { Power, Activity, AlertTriangle, Webcam, Settings, Trash2, Zap, Sun, Moon, TrendingUp, BarChart2, PieChart, Recycle, Clock, ArrowUpRight, Download, BellRing, BellOff, Database, Sliders } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ZAxis } from 'recharts';
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
  const [isConnected, setIsConnected] = useState(socket.connected);

  // Load Camera URL from Settings or Default
  const [camUrl, setCamUrl] = useState(() => {
    const saved = localStorage.getItem('waste_settings');
    return saved ? JSON.parse(saved).camUrl : '192.168.1.3:8080';
  });

  const [rotation, setRotation] = useState(0); // State for video rotation
  const [isTorchOn, setIsTorchOn] = useState(false); // State for Torch
  const [aiData, setAiData] = useState({ class: 'Scanning...', confidence: 0, label_id: -1 });
  const [boxPos, setBoxPos] = useState(null);
  // Automation Refs
  const ignoreMotionRef = useRef(0);
  const resumeTimerRef = useRef(null);
  const itemProcessedRef = useRef(false); // Track if current item is counted
  const hideTimerRef = useRef(null); // Timer for box persistence

  const [history, setHistory] = useState([]);
  const [theme, setTheme] = useState('dark');
  const [graphType, setGraphType] = useState('line');
  const [selectedBin, setSelectedBin] = useState(null);

  // Load Session Data from LocalStorage
  const [eventLog, setEventLog] = useState(() => {
    const saved = localStorage.getItem('waste_session_current');
    return saved ? JSON.parse(saved).eventLog : [];
  });

  const [processingCounts, setProcessingCounts] = useState(() => {
    const saved = localStorage.getItem('waste_session_current');
    return saved ? JSON.parse(saved).processingCounts : {
      total: 0, bio: 0, hazard: 0, wet: 0, dry: 0
    };
  });

  // Time-series data for charts
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [confidenceHistory, setConfidenceHistory] = useState([]);

  // History of PAST sessions
  const [sessionHistory, setSessionHistory] = useState(() => {
    const saved = localStorage.getItem('waste_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // NEW: Session Timer (only when ON), Fullscreen, Notifications
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [sessionDuration, setSessionDuration] = useState('00:00:00');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [expandedGraph, setExpandedGraph] = useState(null); // For graph pop-out modal

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
      setIsConnected(true);
    });
    socket.on('disconnect', () => {
      setIsConnected(false);
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
      socket.off('disconnect');
      socket.off('system_state');
      socket.off('alert');
      socket.off('ai_inference');
    };
  }, []);

  // Session Timer - only runs when system is ON
  useEffect(() => {
    if (!data.isOn) return; // Don't tick if system is off

    const interval = setInterval(() => {
      setActiveSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [data.isOn]);

  // Format active seconds into HH:MM:SS
  useEffect(() => {
    const hours = Math.floor(activeSeconds / 3600);
    const minutes = Math.floor((activeSeconds % 3600) / 60);
    const seconds = activeSeconds % 60;
    setSessionDuration(
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    );
  }, [activeSeconds]);

  // Save Current Session to LocalStorage on Change
  useEffect(() => {
    const sessionData = { processingCounts, eventLog };
    localStorage.setItem('waste_session_current', JSON.stringify(sessionData));
  }, [processingCounts, eventLog]);

  // Save Settings (Camera URL)
  useEffect(() => {
    localStorage.setItem('waste_settings', JSON.stringify({ camUrl, theme }));
  }, [camUrl, theme]);

  // Session Management (Archive to History when turned OFF)
  useEffect(() => {
    // If system turns OFF and we have processed items -> Archive it
    if (!data.isOn && processingCounts.total > 0) {
      const newHistoryEntry = {
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        counts: { ...processingCounts },
        revenue: (processingCounts.total * 0.05).toFixed(2)
      };

      const updatedHistory = [newHistoryEntry, ...sessionHistory];
      setSessionHistory(updatedHistory);
      localStorage.setItem('waste_history', JSON.stringify(updatedHistory));

      // Reset Current Session (per user request: "Current cycle alone")
      setProcessingCounts({ total: 0, bio: 0, hazard: 0, wet: 0, dry: 0 });
      setEventLog([]);
      localStorage.removeItem('waste_session_current');
    }
  }, [data.isOn]); // Runs when power state changes

  // Bin Full Alert - Auto turn off system if any bin reaches 100%
  useEffect(() => {
    const fullBin = data.bins?.find(bin => bin.volume >= 100);
    if (fullBin && data.isOn) {
      socket.emit('toggle_power', false);
      setAlert({ type: 'critical', message: `${fullBin.name} is FULL! System auto-paused.` });
      if (notificationEnabled && Notification.permission === 'granted') {
        new Notification('≡ƒÜ¿ Bin Full Alert!', { body: `${fullBin.name} is full. System paused.` });
      }
    }
  }, [data.bins, data.isOn, notificationEnabled]);

  // Export Event Log to CSV
  const exportToCSV = () => {
    if (eventLog.length === 0) return;
    const headers = ['Time', 'Class', 'Category', 'Confidence'];
    const csv = [
      headers.join(','),
      ...eventLog.map(e => [e.time, e.rawClass, e.category, e.confidence].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waste_log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Request Notification Permission
  const enableNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationEnabled(true);
        new Notification('≡ƒöö Notifications Enabled!', { body: 'You will receive alerts for bin status.' });
      }
    }
  };

  // ESC key to close expanded graph
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setExpandedGraph(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Toggle Fullscreen Camera
  const toggleFullscreen = () => {
    const camElement = document.getElementById('live-feed-img');
    if (camElement) {
      if (!document.fullscreenElement) {
        camElement.requestFullscreen?.();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen?.();
        setIsFullscreen(false);
      }
    }
  };

  // --- AI Logic (Driven by Python Backend) ---
  const [model] = useState(null); // Keep to prevent ReferenceError

  // Listen for Python AI Events (Including Real Box Data)
  useEffect(() => {
    // Helper used above
    const getCategory = (cls) => {
      if (cls.includes('Bio')) return 'Bio-medical';
      if (cls.includes('Haz')) return 'Hazardous';
      if (cls.includes('Wet') || cls.includes('Org')) return 'Wet Waste';
      return 'Dry Waste';
    };

    const handleInference = (inferenceData) => {
      // ...Logic...
    };

    socket.on('ai_inference', handleInference);
    return () => socket.off('ai_inference', handleInference);
  }, [data.isOn]);

  // Set Box Position with 4-Second Persistence
  useEffect(() => {
    // 1. If we have a GOOD detection
    if (aiData.confidence > 50 && aiData.box) {
      // Show it immediately
      setBoxPos({
        x: aiData.box.x,
        y: aiData.box.y,
        w: aiData.box.w,
        h: aiData.box.h
      });

      // Clear any pending "Hide" timer
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

      // Set a NEW timer to hide it 4 seconds from NOW
      // (This will keep being pushed back as long as we have detection)
      hideTimerRef.current = setTimeout(() => {
        setBoxPos(null);
      }, 4000);
    }
    // 2. If NO detection, we do NOTHING.
    // The last known box stays "stuck" on screen until the timer above fires.

  }, [aiData]);

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

  // Helper variables for JSX
  const speed = data.conveyorSpeed;
  const direction = data.conveyorDirection;
  const servos = [0, 1, 2, 3].map(id => ({ id, angle: data.manualServo[id] }));

  return (
    <div className={clsx(
      "min-h-screen font-sans p-6 transition-all duration-700",
      theme === 'dark' ? "animate-mesh-dark text-slate-100" : "animate-mesh-light text-slate-800"
    )}>
      {/* Expanded Graph Modal */}
      <AnimatePresence>
        {expandedGraph && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
            onClick={() => setExpandedGraph(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={clsx(
                "w-[90vw] max-w-5xl p-8 rounded-3xl shadow-2xl border",
                theme === 'dark' ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className={clsx("text-2xl font-bold", theme === 'dark' ? "text-white" : "text-slate-800")}>
                  {expandedGraph.title}
                </h3>
                <button
                  onClick={() => setExpandedGraph(null)}
                  className={clsx("p-2 rounded-full hover:bg-slate-500/20 transition")}
                >
                  <AlertTriangle size={24} className="rotate-45 text-slate-400" />
                </button>
              </div>
              <p className={clsx("text-sm mb-6", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>
                Use mouse wheel or slider to scroll.
              </p>
              <div className="h-[60vh] w-full overflow-x-auto pb-4">
                <div style={{ minWidth: '1000px', height: '100%' }}>
                  {expandedGraph.chart}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session History Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
            onClick={() => setShowHistoryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={clsx(
                "w-[90vw] max-w-4xl p-8 rounded-3xl shadow-2xl border",
                theme === 'dark' ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className={clsx("text-2xl font-bold", theme === 'dark' ? "text-white" : "text-slate-800")}>
                    Session History
                  </h3>
                  <p className="text-sm opacity-60">Archive of past sorting cycles</p>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className={clsx("p-2 rounded-full hover:bg-slate-500/20 transition")}
                >
                  <AlertTriangle size={24} className="rotate-45 text-slate-400" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto">
                {sessionHistory.length === 0 ? (
                  <div className="text-center p-12 opacity-50">No history available yet.</div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="opacity-50 border-b border-slate-700">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Time</th>
                        <th className="p-3">Items</th>
                        <th className="p-3">Revenue</th>
                        <th className="p-3 text-right">Details (Bio/Haz/Wet/Dry)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionHistory.map(session => (
                        <tr key={session.id} className="border-b border-slate-800/50 hover:bg-white/5">
                          <td className="p-3">{session.date}</td>
                          <td className="p-3 font-mono">{session.time}</td>
                          <td className="p-3 font-bold">{session.counts.total}</td>
                          <td className="p-3 text-green-400">${session.revenue}</td>
                          <td className="p-3 text-right font-mono opacity-70">
                            {session.counts.bio}/{session.counts.hazard}/{session.counts.wet}/{session.counts.dry}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className={clsx(
        "flex justify-between items-center mb-8 pb-4 border-b transition-all duration-300",
        theme === 'dark' ? "border-slate-700" : "border-slate-300"
      )}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl shadow-lg shadow-green-500/20">
            <Recycle size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Smart Waste Management</h1>
            <p className="text-xs font-medium opacity-60">AI-Powered Sorting System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md shadow-sm border",
            data.isOn ? (theme === 'dark' ? "bg-green-500/10 border-green-500/30" : "bg-green-100 border-green-200") : (theme === 'dark' ? "bg-red-500/10 border-red-500/30" : "bg-red-100 border-red-200")
          )}>
            <div className={clsx("w-2 h-2 rounded-full animate-pulse", data.isOn ? "bg-green-500" : "bg-red-500")} />
            <span className={clsx("text-xs font-bold uppercase", theme === 'dark' ? "text-slate-300" : "text-slate-600")}>
              {data.isOn ? "System Online" : "System Offline"}
            </span>
          </div>

          <button onClick={toggleTheme} className="p-3 rounded-full hover:bg-slate-500/10 transition">
            {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
          </button>
        </div>
      </header>

      {/* NEW LAYOUT GRID */}
      <div className="grid grid-cols-12 gap-6">

        {/* LEFT COLUMN (Camera & Controls) - 66% width */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">

          {/* Main Camera Feed */}
          <div className={clsx(
            "rounded-3xl p-1 relative overflow-hidden h-[500px] xl:h-[600px] shadow-2xl transition-all duration-500 group",
            theme === 'dark' ? "bg-slate-900 border border-slate-700" : "bg-white border border-slate-200"
          )}>
            <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 border border-white/10">
              <Webcam size={16} className="text-red-500 animate-pulse" />
              <span className="text-xs font-bold text-white tracking-wider">LIVE FEED</span>
            </div>

            <div className="w-full h-full rounded-2xl overflow-hidden relative bg-black flex items-center justify-center">
              {camUrl ? (
                <>
                  <img
                    id="live-feed-img"
                    crossOrigin="anonymous"
                    src={camUrl.startsWith('http') ? `${camUrl}/video` : `http://${camUrl}/video`}
                    alt="Live Feed - Check Console for Errors"
                    className="w-full h-full object-contain transition-transform duration-300"
                    style={{ transform: `rotate(${rotation}deg)` }}
                    onError={(e) => {
                      console.error("Camera Feed Error:", e);
                      // Don't clear URL immediately so user can see it failed
                      // setCamUrl(''); 
                    }}
                  />
                  {/* Camera Controls Overlay */}
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button
                      onClick={() => {
                        playClick();
                        const mode = !isTorchOn ? 'enabletorch' : 'disabletorch';
                        fetch(`${camUrl}/${mode}`, { mode: 'no-cors' })
                          .then(() => setIsTorchOn(!isTorchOn))
                          .catch(err => console.error("Torch error", err));
                      }}
                      className={clsx("p-2 rounded-full text-white transition-opacity backdrop-blur-md border border-white/20", isTorchOn ? "bg-yellow-500/90 hover:bg-yellow-600" : "bg-black/40 hover:bg-yellow-500 opacity-0 group-hover:opacity-100")}
                    >
                      <Zap size={18} className={isTorchOn ? "fill-white" : ""} />
                    </button>
                    <button onClick={() => { playClick(); setRotation(r => (r + 90) % 360); }} className="p-2 bg-black/40 backdrop-blur-md border border-white/20 hover:bg-blue-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <Settings size={18} className="rotate-45" />
                    </button>
                    <button onClick={() => { playClick(); setCamUrl(''); }} className="p-2 bg-black/40 backdrop-blur-md border border-white/20 hover:bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={18} />
                    </button>
                    <button onClick={() => { playClick(); toggleFullscreen(); }} className="p-2 bg-black/40 backdrop-blur-md border border-white/20 hover:bg-purple-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <Activity size={18} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center p-8">
                  <div className="w-20 h-20 mx-auto bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-500">
                    <Webcam size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-300 mb-2">Connect Camera</h3>
                  <div className="flex gap-2 max-w-xs mx-auto">
                    <input
                      type="text"
                      placeholder="http://192.168.1.x:8080"
                      className="flex-1 rounded-lg bg-slate-800 border-slate-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      onKeyDown={(e) => e.key === 'Enter' && setCamUrl(e.currentTarget.value)}
                    />
                  </div>
                </div>
              )}

              {/* Bounding Box */}
              {boxPos && (
                <div
                  className="absolute border-4 border-yellow-400 rounded-lg shadow-[0_0_20px_rgba(250,204,21,0.5)] transition-all duration-100 z-20"
                  style={{
                    left: `${boxPos.x}%`,
                    top: `${boxPos.y}%`,
                    width: `${boxPos.w}%`,
                    height: `${boxPos.h}%`,
                  }}
                >
                  <div className="absolute -top-10 left-0 bg-yellow-400 text-black px-3 py-1 rounded-md text-sm font-bold shadow-lg flex items-center gap-2">
                    {aiData.class} <span className="text-xs bg-black/20 px-1 rounded">{aiData.confidence.toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Status & Connectivity Strip */}
          <div className={clsx(
            "p-4 rounded-2xl flex items-center justify-between",
            theme === 'dark' ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-slate-200"
          )}>
            <div className="flex items-center gap-4">
              <div className={clsx("px-3 py-1 rounded-full text-xs font-bold border", isConnected ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400")}>
                {isConnected ? "SOCKET CONNECTED" : "SOCKET DISCONNECTED"}
              </div>
              <div className={clsx("px-3 py-1 rounded-full text-xs font-bold border", model ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400")}>
                {model ? "MODEL READY" : "LOADING MODEL..."}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono opacity-60">
              <Activity size={14} /> Inference: {data.confidence ? `${(1000 / 10).toFixed(0)} FPS` : "Idle"}
            </div>
          </div>

          {/* Control Panel Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Conveyor Controls */}
            <div className={clsx("p-6 rounded-2xl border", theme === 'dark' ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200")}>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2 opacity-70">
                <Settings size={16} /> Conveyor Control
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between bg-black/20 p-1 rounded-xl">
                  {['Slow', 'Medium', 'Fast'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={clsx(
                        "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                        speed === s ? "bg-blue-600 text-white shadow-lg" : "hover:bg-white/5 text-slate-400"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => toggleDirection(direction === 'Forward' ? 'Backward' : 'Forward')}
                  className={clsx(
                    "w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                    direction === 'Forward'
                      ? (theme === 'dark' ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-200 hover:bg-slate-300")
                      : "bg-orange-500 hover:bg-orange-600 text-white animate-pulse"
                  )}
                >
                  {direction === 'Forward' ? 'Forward Direction' : 'Reverse Mode Active'}
                </button>
              </div>
            </div>

            {/* Servo Controls */}
            <div className={clsx("p-6 rounded-2xl border", theme === 'dark' ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200")}>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2 opacity-70">
                <Sliders size={16} /> Manual Servo Override
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {servos.map(servo => (
                  <div key={servo.id} className="flex flex-col items-center gap-2">
                    <div className="h-24 w-full bg-black/20 rounded-full relative">
                      <div
                        className="absolute bottom-0 w-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ height: `${(servo.angle / 180) * 100}%` }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="180"
                      value={servo.angle}
                      onChange={(e) => setServo(servo.id, parseInt(e.target.value))}
                      className="w-full h-1 bg-transparent appearance-none cursor-pointer"
                    />
                    <span className="text-[10px] font-mono opacity-50">S{servo.id}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (Metrics, Bins, Quick Actions) - 33% width */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">

          {/* Main Power Button & Timer */}
          <div className={clsx(
            "p-6 rounded-3xl border flex flex-col gap-6",
            theme === 'dark' ? "bg-indigo-900/20 border-indigo-500/30" : "bg-indigo-50 border-indigo-200"
          )}>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black">System Control</h2>
                <p className="text-sm opacity-60">Master Switch</p>
              </div>
              <button
                onClick={togglePower}
                className={clsx(
                  "w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-all duration-300",
                  data.isOn ? "bg-red-500 hover:bg-red-600 shadow-red-500/40" : "bg-green-500 hover:bg-green-600 shadow-green-500/40"
                )}
              >
                <Power size={32} className="text-white" />
              </button>
            </div>

            <div className="bg-black/20 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock size={20} className="text-indigo-400" />
                <div>
                  <div className="text-[10px] uppercase font-bold opacity-50 tracking-wider">Session Time</div>
                  <div className="text-2xl font-mono font-bold tracking-widest">{sessionDuration}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div
              onClick={() => setShowHistoryModal(true)}
              className={clsx(
                "p-5 rounded-2xl border cursor-pointer hover:border-blue-500 transition-all active:scale-95",
                theme === 'dark' ? "bg-slate-800/60 border-slate-700" : "bg-white border-slate-200"
              )}
            >
              <div className="text-xs font-bold uppercase opacity-50 mb-2 flex items-center justify-between">
                Processed <Clock size={12} className="opacity-50" />
              </div>
              <div className="text-3xl font-black mb-1">{processingCounts.total}</div>
              <div className="text-xs text-green-400 font-bold flex items-center gap-1"><ArrowUpRight size={12} /> Current Cycle</div>
            </div>
            <div className={clsx("p-5 rounded-2xl border relative overflow-hidden", theme === 'dark' ? "bg-emerald-900/20 border-emerald-500/30" : "bg-emerald-50 border-emerald-200")}>
              <div className="relative z-10">
                <div className="text-xs font-bold uppercase opacity-60 mb-2 text-emerald-400">Revenue</div>
                <div className="text-3xl font-black text-emerald-500">${(processingCounts.total * 0.05).toFixed(2)}</div>
                <div className="text-xs text-emerald-600 font-bold opacity-80">Est. Value</div>
              </div>
              <TrendingUp className="absolute bottom-2 right-2 text-emerald-500/20" size={60} />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={exportToCSV}
              className={clsx(
                "p-4 rounded-xl border flex flex-col items-center gap-2 hover:scale-[1.02] transition-transform",
                theme === 'dark' ? "bg-slate-800 border-slate-700 hover:bg-slate-700" : "bg-white border-slate-200 hover:bg-slate-50"
              )}
            >
              <Download size={20} className="text-blue-500" />
              <span className="text-xs font-bold">Export Report</span>
            </button>
            <button
              onClick={enableNotifications}
              className={clsx(
                "p-4 rounded-xl border flex flex-col items-center gap-2 hover:scale-[1.02] transition-transform",
                notificationEnabled
                  ? (theme === 'dark' ? "bg-yellow-900/20 border-yellow-700" : "bg-yellow-50 border-yellow-200")
                  : (theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")
              )}
            >
              {notificationEnabled ? <BellRing size={20} className="text-yellow-500" /> : <BellOff size={20} className="text-slate-500" />}
              <span className="text-xs font-bold">{notificationEnabled ? "Alerts On" : "Enable Alerts"}</span>
            </button>
          </div>

          {/* Bin Status Stack */}
          <div className={clsx("flex-1 p-6 rounded-3xl border flex flex-col", theme === 'dark' ? "bg-slate-800/40 border-slate-700" : "bg-white border-slate-200")}>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2 opacity-70">
              <Database size={16} /> Bin Capacities
            </h3>
            <div className="flex-1 flex flex-col justify-between gap-4">
              {data.bins.map((bin) => (
                <div key={bin.id} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="capitalize">{bin.name}</span>
                    <span className={bin.volume > 90 ? "text-red-500" : "opacity-60"}>{bin.volume}%</span>
                  </div>
                  <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden">
                    <div
                      className={clsx("h-full rounded-full transition-all duration-1000",
                        bin.volume > 90 ? "bg-red-500 animate-pulse" :
                          bin.type === 'bio' ? "bg-green-500" :
                            bin.type === 'hazard' ? "bg-red-500" :
                              bin.type === 'wet' ? "bg-blue-500" : "bg-amber-500"
                      )}
                      style={{ width: `${bin.volume}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* BOTTOM SECTION: ANALYTICS (Full Width) */}
        <div className="col-span-12 mt-4">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <BarChart2 className="text-blue-500" /> Real-Time Analytics
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-slate-700 to-transparent"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Category Distribution (Pie) */}
            <div
              className={clsx("p-6 rounded-3xl border cursor-pointer hover:border-blue-500/50 transition-all", theme === 'dark' ? "bg-slate-800/40 border-slate-700" : "bg-white border-slate-200")}
              onClick={() => setExpandedGraph({
                title: 'Category Distribution', chart: (
                  <ResponsiveContainer width="100%" height="100%"><RechartsPie><Pie data={[{ name: 'Bio', value: processingCounts.bio }, { name: 'Haz', value: processingCounts.hazard }, { name: 'Wet', value: processingCounts.wet }, { name: 'Dry', value: processingCounts.dry }]} cx="50%" cy="50%" innerRadius={100} outerRadius={150} paddingAngle={2} dataKey="value" label><Cell fill="#10b981" /><Cell fill="#ef4444" /><Cell fill="#3b82f6" /><Cell fill="#f59e0b" /></Pie><Legend /><Tooltip /></RechartsPie></ResponsiveContainer>
                )
              })}
            >
              <h3 className="text-sm font-bold opacity-70 mb-4 uppercase">Category Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPie>
                  <Pie data={[{ name: 'Bio', value: processingCounts.bio }, { name: 'Haz', value: processingCounts.hazard }, { name: 'Wet', value: processingCounts.wet }, { name: 'Dry', value: processingCounts.dry }]} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    <Cell fill="#10b981" /><Cell fill="#ef4444" /><Cell fill="#3b82f6" /><Cell fill="#f59e0b" />
                  </Pie>
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            </div>

            {/* 2. Items Processed (Bar) */}
            <div
              className={clsx("p-6 rounded-3xl border cursor-pointer hover:border-blue-500/50 transition-all", theme === 'dark' ? "bg-slate-800/40 border-slate-700" : "bg-white border-slate-200")}
              onClick={() => setExpandedGraph({
                title: 'Items by Category', chart: (
                  <ResponsiveContainer width="100%" height="100%"><BarChart data={[{ name: 'Bio', count: processingCounts.bio }, { name: 'Haz', count: processingCounts.hazard }, { name: 'Wet', count: processingCounts.wet }, { name: 'Dry', count: processingCounts.dry }]}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="count"><Cell fill="#10b981" /><Cell fill="#ef4444" /><Cell fill="#3b82f6" /><Cell fill="#f59e0b" /></Bar></BarChart></ResponsiveContainer>
                )
              })}
            >
              <h3 className="text-sm font-bold opacity-70 mb-4 uppercase">Items by Category</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[{ name: 'Bio', count: processingCounts.bio }, { name: 'Haz', count: processingCounts.hazard }, { name: 'Wet', count: processingCounts.wet }, { name: 'Dry', count: processingCounts.dry }]}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} /><XAxis dataKey="name" fontSize={10} /><YAxis fontSize={10} /><Bar dataKey="count"><Cell fill="#10b981" /><Cell fill="#ef4444" /><Cell fill="#3b82f6" /><Cell fill="#f59e0b" /></Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 3. Detections Line */}
            <div
              className={clsx("p-6 rounded-3xl border cursor-pointer hover:border-blue-500/50 transition-all", theme === 'dark' ? "bg-slate-800/40 border-slate-700" : "bg-white border-slate-200")}
              onClick={() => setExpandedGraph({
                title: 'Detections Trend', chart: (
                  <ResponsiveContainer width="100%" height="100%"><LineChart data={timeSeriesData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="time" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="bio" stroke="#10b981" strokeWidth={3} /><Line type="monotone" dataKey="hazard" stroke="#ef4444" strokeWidth={3} /><Line type="monotone" dataKey="wet" stroke="#3b82f6" strokeWidth={3} /><Line type="monotone" dataKey="dry" stroke="#f59e0b" strokeWidth={3} /></LineChart></ResponsiveContainer>
                )
              })}
            >
              <h3 className="text-sm font-bold opacity-70 mb-4 uppercase">Latest Trends</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} /><XAxis dataKey="time" fontSize={10} /><YAxis fontSize={10} /><Line type="monotone" dataKey="bio" stroke="#10b981" dot={false} /><Line type="monotone" dataKey="hazard" stroke="#ef4444" dot={false} /><Line type="monotone" dataKey="wet" stroke="#3b82f6" dot={false} /><Line type="monotone" dataKey="dry" stroke="#f59e0b" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 4. Area Chart (Span 2) */}
            <div
              className={clsx("p-6 rounded-3xl border cursor-pointer hover:border-blue-500/50 transition-all lg:col-span-2", theme === 'dark' ? "bg-slate-800/40 border-slate-700" : "bg-white border-slate-200")}
              onClick={() => setExpandedGraph({
                title: 'Cumulative Processing', chart: (
                  <ResponsiveContainer width="100%" height="100%"><AreaChart data={timeSeriesData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="time" /><YAxis /><Tooltip /><Legend /><Area type="monotone" dataKey="bio" stackId="1" fill="#10b981" /><Area type="monotone" dataKey="hazard" stackId="1" fill="#ef4444" /><Area type="monotone" dataKey="wet" stackId="1" fill="#3b82f6" /><Area type="monotone" dataKey="dry" stackId="1" fill="#f59e0b" /></AreaChart></ResponsiveContainer>
                )
              })}
            >
              <h3 className="text-sm font-bold opacity-70 mb-4 uppercase">Cumulative Processing</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} /><XAxis dataKey="time" fontSize={10} /><YAxis fontSize={10} /><Area type="monotone" dataKey="bio" stackId="1" fill="#10b981" fillOpacity={0.5} stroke="#10b981" /><Area type="monotone" dataKey="hazard" stackId="1" fill="#ef4444" fillOpacity={0.5} stroke="#ef4444" /><Area type="monotone" dataKey="wet" stackId="1" fill="#3b82f6" fillOpacity={0.5} stroke="#3b82f6" /><Area type="monotone" dataKey="dry" stackId="1" fill="#f59e0b" fillOpacity={0.5} stroke="#f59e0b" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* 5. Scatter Chart (AI Confidence) */}
            <div
              className={clsx("p-6 rounded-3xl border cursor-pointer hover:border-blue-500/50 transition-all", theme === 'dark' ? "bg-slate-800/40 border-slate-700" : "bg-white border-slate-200")}
              onClick={() => setExpandedGraph({
                title: 'AI Confidence Distribution', chart: (
                  <ResponsiveContainer width="100%" height="100%"><ScatterChart><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="time" name="Time" /><YAxis dataKey="confidence" name="Confidence" /><Tooltip /><Scatter data={confidenceHistory} fill="#8884d8" /></ScatterChart></ResponsiveContainer>
                )
              })}
            >
              <h3 className="text-sm font-bold opacity-70 mb-4 uppercase">AI Confidence</h3>
              <ResponsiveContainer width="100%" height={200}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} /><XAxis dataKey="time" fontSize={10} /><YAxis dataKey="confidence" domain={[0, 100]} fontSize={10} />
                  <Scatter data={confidenceHistory} fill="#8b5cf6" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications overlay (if enabled) */}
      {notificationEnabled && <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg text-xs font-bold animate-bounce hidden">
        Notifications Active
      </div>}

    </div>
  );
}

export default App;
