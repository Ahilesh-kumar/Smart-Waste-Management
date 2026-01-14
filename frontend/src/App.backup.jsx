import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { Power, Activity, AlertTriangle, Webcam, Settings, Trash2, Zap, Sun, Moon, TrendingUp, BarChart2, PieChart, Recycle, Clock, ArrowUpRight, Download, BellRing, BellOff, Database, Sliders } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ZAxis } from 'recharts';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';

const socket = io('http://localhost:3001');

// --- Graph Enhancement Components ---
const binColors = {
  0: { main: '#06b6d4', gradient: ['#06b6d4', '#0891b2'] }, // Wet (Cyan)
  1: { main: '#f59e0b', gradient: ['#f59e0b', '#d97706'] }, // Dry (Amber)
  2: { main: '#10b981', gradient: ['#10b981', '#059669'] }, // Bio (Emerald)
  3: { main: '#f43f5e', gradient: ['#f43f5e', '#e11d48'] }  // Hazard (Rose)
};



// Glassmorphism Chart Card Wrapper
const ChartCard = ({ children, title, theme, onClick, className = '' }) => (
  <motion.div
    whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)' }}
    transition={{ type: 'spring', stiffness: 300 }}
    className={clsx(
      "p-6 rounded-3xl border cursor-pointer transition-all backdrop-blur-xl",
      theme === 'dark'
        ? "bg-slate-800/30 border-slate-600/50 hover:border-blue-500/50 shadow-lg shadow-black/20"
        : "bg-white/40 border-white/60 hover:border-blue-400/50 shadow-lg shadow-slate-200/50",
      className
    )}
    onClick={onClick}
  >
    <h3 className="text-sm font-bold opacity-70 mb-4 uppercase tracking-wider">{title}</h3>
    {children}
  </motion.div>
);

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
  // Tuning State
  const [sensitivity, setSensitivity] = useState('High'); // Low, Medium, High
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

  // Phase 3: Advanced Chart States
  const [hourlyData, setHourlyData] = useState([]); // Hourly stacked bar data
  const [showComparisonMode, setShowComparisonMode] = useState(false); // Toggle for comparison view
  const [drillDownCategory, setDrillDownCategory] = useState(null); // For pie drill-down


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
      // IMPORTANT: Never overwrite isOn from backend - keep it local-only
      // This prevents race conditions with multiple tabs/connections
      setData(prev => ({ ...newState, isOn: prev.isOn }));

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
        new Notification('🚨 Bin Full Alert!', { body: `${fullBin.name} is full. System paused.` });
      }
    }
  }, [data.bins, data.isOn, notificationEnabled]);

  // Phase 3: Hourly Data Aggregation
  useEffect(() => {
    const currentHour = new Date().getHours();
    setHourlyData(prev => {
      const existing = prev.find(h => h.hour === currentHour);
      if (existing) {
        // Update existing hour
        return prev.map(h => h.hour === currentHour ? {
          ...h,
          bio: processingCounts.bio,
          hazard: processingCounts.hazard,
          wet: processingCounts.wet,
          dry: processingCounts.dry,
          total: processingCounts.total
        } : h);
      } else {
        // Add new hour entry
        return [...prev, {
          hour: currentHour,
          label: `${currentHour}:00`,
          bio: processingCounts.bio,
          hazard: processingCounts.hazard,
          wet: processingCounts.wet,
          dry: processingCounts.dry,
          total: processingCounts.total
        }].slice(-12); // Keep last 12 hours
      }
    });
  }, [processingCounts]);

  // Phase 3: Calculate Historical Averages for Comparison Mode
  const getHistoricalAverages = () => {
    if (sessionHistory.length === 0) return { bio: 0, hazard: 0, wet: 0, dry: 0, total: 0 };
    const totals = sessionHistory.reduce((acc, s) => ({
      bio: acc.bio + (s.counts?.bio || 0),
      hazard: acc.hazard + (s.counts?.hazard || 0),
      wet: acc.wet + (s.counts?.wet || 0),
      dry: acc.dry + (s.counts?.dry || 0),
      total: acc.total + (s.counts?.total || 0)
    }), { bio: 0, hazard: 0, wet: 0, dry: 0, total: 0 });

    return {
      bio: Math.round(totals.bio / sessionHistory.length),
      hazard: Math.round(totals.hazard / sessionHistory.length),
      wet: Math.round(totals.wet / sessionHistory.length),
      dry: Math.round(totals.dry / sessionHistory.length),
      total: Math.round(totals.total / sessionHistory.length)
    };
  };

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
        new Notification('🔔 Notifications Enabled!', { body: 'You will receive alerts for bin status.' });
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

    // Voice Feedback Helper
    const speak = (text) => {
      if (!window.speechSynthesis) return;
      // Cancel previous speech to avoid queue buildup
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    };

    const handleInference = (inferenceData) => {
      try {
        if (!inferenceData) return;

        // If system is OFF, pause AI detection
        if (!data.isOn) {
          setAiData(prev => ({
            ...prev,
            class: 'System Off',
            confidence: 0,
            box: null
          }));
          return;
        }

        // Always update AI display data
        setAiData(inferenceData);

        const { is_moving, object_present, class: detectedClass, confidence } = inferenceData;
        const now = Date.now();

        // --- STATE MACHINE LOGIC ---
        // 1. If NO Object Present -> Reset the "Processed" flag
        if (!object_present) {
          ignoreMotionRef.current = 0;
          if (itemProcessedRef.current) {
            itemProcessedRef.current = false;
            console.log("♻️ Item Left. System Ready.");
          }
          return;
        }

        // 2. If Object Present & Moving -> Wait
        if (is_moving) {
          return;
        }

        // 3. Check if backend already counted this (fingerprint match)
        const { already_counted } = inferenceData;
        if (already_counted) {
          return; // Python backend says this is a duplicate
        }

        // 4. Sensitivity Logic (Frontend Tuning)
        let threshold = 80; // High (Default)
        if (sensitivity === 'Medium') threshold = 70;
        if (sensitivity === 'Low') threshold = 60;

        // 5. If Stationary and not yet processed...
        // STRICT: 80%+ confidence required, reject Unknown objects
        const isUnknown = detectedClass === 'Unknown';
        // Check confidence against user-selected sensitivity threshold
        if (!itemProcessedRef.current && detectedClass && !isUnknown && detectedClass !== 'Moving...' && detectedClass !== 'Scanning...' && confidence >= threshold) {

          // Mark as Processed
          itemProcessedRef.current = true;
          console.log(`✅ COUNTED: ${detectedClass} (${confidence}%) [Sensitivity: ${sensitivity}]`);

          const category = getCategory(detectedClass);

          // Inline Category Logic (case-insensitive to match "bio-1", "haz-2" etc.)
          let cat = 'Dry Waste';
          const classLower = detectedClass.toLowerCase();
          if (classLower.includes('bio')) cat = 'Bio-medical';
          else if (classLower.includes('haz')) cat = 'Hazardous';
          else if (classLower.includes('wet') || classLower.includes('org')) cat = 'Wet Waste';
          else if (classLower.includes('met') || classLower.includes('e-waste') || classLower.includes('dry') || classLower.includes('rec')) cat = 'Dry Waste';

          const logEntry = {
            id: now,
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            rawClass: detectedClass,
            category: cat,
            confidence: confidence.toFixed(1)
          };

          // Update Event Log
          setEventLog(prev => [logEntry, ...prev].slice(0, 50));

          // Update Processing Counts
          setProcessingCounts(prev => {
            const newCounts = { ...prev, total: prev.total + 1 };
            if (cat === 'Bio-medical') newCounts.bio += 1;
            else if (cat === 'Hazardous') newCounts.hazard += 1;
            else if (cat === 'Wet Waste') newCounts.wet += 1;
            else newCounts.dry += 1;
            return newCounts;
          });

          // Update Time Series Charts
          setTimeSeriesData(prev => [...prev, {
            time: logEntry.time,
            total: 1,
            bio: cat === 'Bio-medical' ? 1 : 0,
            hazard: cat === 'Hazardous' ? 1 : 0,
            dry: cat === 'Dry Waste' ? 1 : 0,
            wet: cat === 'Wet Waste' ? 1 : 0
          }].slice(-20));

          // Update Confidence History for Scatter Plot
          setConfidenceHistory(prev => {
            const newEntry = {
              time: logEntry.time,
              confidence: parseFloat(confidence.toFixed(1)),
              category: category
            };
            return [...prev, newEntry].slice(-50);
          });
        }
      } catch (err) {
        console.error("Critical Error in AI Handler:", err);
      }
    };

    socket.on('ai_inference', handleInference);
    return () => socket.off('ai_inference', handleInference);
  }, [data.isOn, sensitivity]);

  // Voice Feedback for System Status
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(data.isOn ? "System Online" : "System Offline");
    window.speechSynthesis.speak(utterance);
  }, [data.isOn]);

  // Voice Feedback for Alerts (Bin Full)
  useEffect(() => {
    if (alert && alert.type === 'warning') {
      const utterance = new SpeechSynthesisUtterance(`Warning: ${alert.message}`);
      window.speechSynthesis.speak(utterance);
    }
    if (alert && alert.type === 'critical') {
      const utterance = new SpeechSynthesisUtterance(`Critical Alert: ${alert.message}. Stopping System.`);
      window.speechSynthesis.speak(utterance);
    }
  }, [alert]);

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

  // Debounce ref for toggle
  const toggleDebounceRef = useRef(false);
  // Lock ref to prevent system_state from overwriting isOn
  const toggleLockRef = useRef(false);

  // Save Session on Stop
  useEffect(() => {
    if (!data.isOn && activeSeconds > 10) { // Only save meaningful sessions (>10s)
      const newSession = {
        id: Date.now(),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        startTime: new Date(Date.now() - activeSeconds * 1000).toLocaleTimeString(),
        endTime: new Date().toLocaleTimeString(),
        duration: sessionDuration,
        processingCounts: { ...processingCounts },
        timeSeriesData: [...timeSeriesData],
        hourlyData: [...hourlyData]
      };

      const updatedHistory = [newSession, ...sessionHistory].slice(0, 20); // Keep last 20
      setSessionHistory(updatedHistory);
      localStorage.setItem('waste_history', JSON.stringify(updatedHistory));
      console.log("💾 Session Saved:", newSession);
    }
  }, [data.isOn]);

  // Handle Loading Historical Session
  const loadHistorySession = (session) => {
    if (!expandedGraph || !expandedGraph.graphId) return;

    let historyChart = null;
    const { processingCounts: cts, timeSeriesData: tsd, hourlyData: hd } = session;

    // Re-generate chart based on type (Simplified reproduction of the main charts)
    if (expandedGraph.graphId === 'pie') {
      historyChart = (
        <ResponsiveContainer width="100%" height={400}>
          <RechartsPie>
            <Pie data={[{ name: 'Bio', value: cts.bio }, { name: 'Hazard', value: cts.hazard }, { name: 'Wet', value: cts.wet }, { name: 'Dry', value: cts.dry }]} cx="50%" cy="50%" innerRadius={100} outerRadius={150} paddingAngle={2} dataKey="value" label>
              <Cell fill="url(#gradientBio)" />
              <Cell fill="url(#gradientHazard)" />
              <Cell fill="url(#gradientWet)" />
              <Cell fill="url(#gradientDry)" />
            </Pie>
            <Legend />
            <Tooltip />
          </RechartsPie>
        </ResponsiveContainer>
      );
    } else if (expandedGraph.graphId === 'bar') {
      historyChart = (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={[{ name: 'Bio', count: cts.bio }, { name: 'Hazard', count: cts.hazard }, { name: 'Wet', count: cts.wet }, { name: 'Dry', count: cts.dry }]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count">
              <Cell fill="url(#gradientBio)" />
              <Cell fill="url(#gradientHazard)" />
              <Cell fill="url(#gradientWet)" />
              <Cell fill="url(#gradientDry)" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    } else if (expandedGraph.graphId === 'area') {
      historyChart = (
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={tsd}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="bio" stackId="1" fill="url(#gradientBio)" stroke="#10b981" />
            <Area type="monotone" dataKey="hazard" stackId="1" fill="url(#gradientHazard)" stroke="#ef4444" />
            <Area type="monotone" dataKey="wet" stackId="1" fill="url(#gradientWet)" stroke="#3b82f6" />
            <Area type="monotone" dataKey="dry" stackId="1" fill="url(#gradientDry)" stroke="#f59e0b" />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (historyChart) {
      setExpandedGraph(prev => ({
        ...prev,
        title: `${prev.title} (Snapshot: ${session.date} ${session.startTime})`,
        chart: historyChart
      }));
    }
  };

  const togglePower = () => {
    // Prevent rapid toggling
    if (toggleDebounceRef.current) {
      console.log('⏳ Toggle debounced, please wait...');
      return;
    }

    toggleDebounceRef.current = true;
    toggleLockRef.current = true;  // Lock to prevent system_state override

    playClick();
    const newState = !data.isOn;
    console.log(`🔌 Toggling power to: ${newState}`);

    // Update local state immediately for instant UI feedback
    setData(prev => ({ ...prev, isOn: newState }));

    // Also emit to backend
    socket.emit('toggle_power', newState);

    // Release debounce after 500ms
    setTimeout(() => {
      toggleDebounceRef.current = false;
    }, 500);

    // Release lock after 2 seconds (enough time for backend to sync)
    setTimeout(() => {
      toggleLockRef.current = false;
      console.log('🔓 Toggle lock released');
    }, 2000);
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
    <div className={clsx("min-h-screen p-6 transition-colors duration-500 font-sans selection:bg-blue-500/30", theme === 'dark' ? "bg-[#0f172a] text-slate-100" : "bg-slate-50 text-slate-900")}>

      {/* Global SVG Gradients for Charts */}
      <svg style={{ height: 0, width: 0, position: 'absolute' }}>
        <defs>
          <linearGradient id="gradientBio" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
            <stop offset="95%" stopColor="#059669" stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="gradientHazard" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9} />
            <stop offset="95%" stopColor="#dc2626" stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="gradientWet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="gradientDry" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
            <stop offset="95%" stopColor="#d97706" stopOpacity={0.6} />
          </linearGradient>
        </defs>
      </svg>
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
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={clsx(
                "w-[90vw] max-w-6xl p-6 rounded-3xl shadow-2xl border flex flex-col max-h-[90vh]",
                theme === 'dark' ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6 px-2">
                <div>
                  <h3 className={clsx("text-2xl font-bold", theme === 'dark' ? "text-white" : "text-slate-800")}>
                    {expandedGraph.title}
                  </h3>
                  <p className="text-xs opacity-50">View real-time data or select a past session</p>
                </div>
                <button
                  onClick={() => setExpandedGraph(null)}
                  className={clsx("p-2 rounded-full transition", theme === 'dark' ? "hover:bg-slate-800" : "hover:bg-slate-100")}
                >
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              {/* Modal Content Grid */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 min-h-0">

                {/* Sidebar: Session History */}
                <div className={clsx("hidden md:block col-span-1 border-r pr-4 overflow-y-auto custom-scrollbar flex flex-col", theme === 'dark' ? "border-slate-700" : "border-slate-200")}>
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-4 opacity-70 sticky top-0 bg-inherit z-10 py-1 flex items-center gap-2">
                    <Clock size={12} /> Past Sessions
                  </h4>
                  <div className="space-y-2 pb-2">
                    {sessionHistory.length === 0 && <p className="text-xs opacity-50 italic px-2">No history saved yet.</p>}
                    {sessionHistory.map(session => (
                      <div
                        key={session.id}
                        onClick={() => loadHistorySession(session)}
                        className={clsx(
                          "p-3 rounded-xl cursor-pointer transition-all border border-transparent",
                          theme === 'dark' ? "bg-slate-800 hover:bg-slate-700 hover:border-slate-600" : "bg-slate-100 hover:bg-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold opacity-70">{session.date}</span>
                          <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 rounded">{session.duration}</span>
                        </div>
                        <div className="text-xs font-mono">{session.startTime} - {session.endTime}</div>
                        <div className="flex gap-2 mt-2 text-[10px] opacity-60">
                          <span className="text-green-400">Bio: {session.processingCounts.bio}</span>
                          <span className="text-red-400">Haz: {session.processingCounts.hazard}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Main Graph Area */}
                <div className="col-span-1 md:col-span-3 h-full flex flex-col min-h-0">
                  <div className={clsx("flex-1 rounded-2xl p-4 relative border overflow-hidden", theme === 'dark' ? "bg-black/20 border-slate-700/50" : "bg-slate-50 border-slate-200")}>
                    {expandedGraph.chart}
                  </div>
                  <p className="text-center text-[10px] opacity-40 mt-3 flex items-center justify-center gap-2 font-mono">
                    <Info size={10} /> {expandedGraph.title.includes('Snapshot') ? "Viewing Historical Snapshot" : "Live Real-Time Data"}
                  </p>
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
                <img
                  src={`http://${camUrl}/video`}
                  alt="Live Camera Feed"
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  style={{
                    transform: `rotate(${rotation}deg) scale(${isTorchOn ? 1.1 : 1})`,
                    filter: `brightness(${isTorchOn ? 1.2 : 1}) contrast(1.1)`
                  }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}

              {/* Fallback / Loading State */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 bg-slate-900" style={{ display: camUrl ? 'none' : 'flex' }}>
                <WifiOff size={48} className="mb-4 opacity-50" />
                <p className="text-lg font-bold">Signal Lost</p>
                <p className="text-xs opacity-50">Check camera connection</p>
              </div>

              {/* AI Bounding Box Overlay */}
              {boxPos && (
                <div
                  className="absolute border-2 border-green-400 rounded-lg shadow-[0_0_15px_rgba(74,222,128,0.5)] transition-all duration-100 ease-linear pointer-events-none"
                  style={{
                    left: `${boxPos.x}%`,
                    top: `${boxPos.y}%`,
                    width: `${boxPos.w}%`,
                    height: `${boxPos.h}%`
                  }}
                >
                  <div className="absolute -top-8 left-0 bg-green-500 text-black text-xs font-black px-2 py-1 rounded shadow-lg uppercase tracking-wider flex items-center gap-1">
                    <Scan size={12} /> {boxPos.label}
                  </div>
                </div>
              )}

              {/* System Messages Overlay */}
              <AnimatePresence>
                {alert && (
                  <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full shadow-2xl z-20 flex items-center gap-3 font-bold"
                  >
                    <AlertTriangle size={20} className="animate-bounce" />
                    {alert}
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* Camera Controls Bar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full flex items-center gap-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button
                onClick={() => setRotation(r => (r + 90) % 360)}
                className="text-white/80 hover:text-white transition hover:scale-110 active:scale-95"
                title="Rotate Camera"
              >
                <RefreshCw size={20} />
              </button>
              <div className="w-px h-6 bg-white/20"></div>
              <button
                onClick={() => setIsTorchOn(!isTorchOn)}
                className={clsx("transition hover:scale-110 active:scale-95", isTorchOn ? "text-yellow-400" : "text-white/80 hover:text-white")}
                title="Toggle Enhancement"
              >
                {isTorchOn ? <Zap size={20} fill="currentColor" /> : <ZapOff size={20} />}
              </button>
              <div className="w-px h-6 bg-white/20"></div>
              <button
                onClick={() => {
                  const newUrl = prompt("Enter Camera IP URL:", camUrl);
                  if (newUrl) {
                    setCamUrl(newUrl);
                    localStorage.setItem('waste_settings', JSON.stringify({ camUrl: newUrl }));
                  }
                }}
                className="text-white/80 hover:text-white transition hover:scale-110 active:scale-95"
                title="Settings"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>

          {/* System Calibration Panel (Sensitivity) */}
          <div className={clsx(
            "p-6 rounded-3xl border transition-all hover:shadow-lg",
            theme === 'dark' ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200"
          )}>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <Sliders size={20} className="text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">System Calibration</h3>
                  <p className="text-[10px] opacity-60 uppercase tracking-widest">AI Vision Sensitivity</p>
                </div>
              </div>

              <div className="flex gap-1 bg-black/20 p-1 rounded-xl">
                {['Low', 'Medium', 'High'].map(level => (
                  <button
                    key={level}
                    onClick={() => setSensitivity(level)}
                    className={clsx(
                      "px-3 py-1 text-[10px] font-bold rounded-lg transition-all",
                      sensitivity === level
                        ? (level === 'High' ? "bg-green-500 text-white" : level === 'Medium' ? "bg-yellow-500 text-black" : "bg-red-500 text-white")
                        : "hover:bg-white/10 text-slate-400"
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] opacity-50 px-2 transition-all duration-300">
              {sensitivity === 'High' ? 'Strict (80%+). Fewer false positives. Recommended for operation.' :
                sensitivity === 'Medium' ? 'Balanced (70%+). Standard detection range.' :
                  'Aggressive (60%+). Captures more items but may include errors.'}
            </p>
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
          {/* Animated Total Counter */}
          <div className={clsx("px-4 py-2 rounded-xl font-mono text-lg", theme === 'dark' ? "bg-blue-500/10 text-blue-400" : "bg-blue-100 text-blue-600")}>
            Total: <CountUp end={processingCounts.total} duration={0.8} preserveValue />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 1. Category Distribution (Pie) with Drill-Down */}
          <ChartCard title="Category Distribution" theme={theme} onClick={() => setExpandedGraph({
            title: 'Category Distribution', graphId: 'pie', chart: (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie data={[{ name: 'Bio', value: processingCounts.bio }, { name: 'Hazard', value: processingCounts.hazard }, { name: 'Wet', value: processingCounts.wet }, { name: 'Dry', value: processingCounts.dry }]} cx="50%" cy="50%" innerRadius={100} outerRadius={150} paddingAngle={2} dataKey="value" label isAnimationActive animationDuration={800} animationEasing="ease-out">
                    <Cell fill="url(#gradientBio)" />
                    <Cell fill="url(#gradientHazard)" />
                    <Cell fill="url(#gradientWet)" />
                    <Cell fill="url(#gradientDry)" />
                  </Pie>
                  <Legend />
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            )
          })}>
            {processingCounts.total === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] w-full opacity-50">
                <Activity className="animate-pulse text-blue-500 mb-2" size={32} />
                <p className="text-xs font-mono uppercase tracking-widest">Waiting for Items...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPie>
                  <Pie data={[{ name: 'Bio', value: processingCounts.bio }, { name: 'Hazard', value: processingCounts.hazard }, { name: 'Wet', value: processingCounts.wet }, { name: 'Dry', value: processingCounts.dry }]} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" isAnimationActive animationDuration={600} animationEasing="ease-out">
                    <Cell fill="url(#gradientBio)" />
                    <Cell fill="url(#gradientHazard)" />
                    <Cell fill="url(#gradientWet)" />
                    <Cell fill="url(#gradientDry)" />
                  </Pie>
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* 2. Items Processed (Bar) with Gradient */}
          <ChartCard title="Items by Category" theme={theme} onClick={() => setExpandedGraph({
            title: 'Items by Category', graphId: 'bar', chart: (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ name: 'Bio', count: processingCounts.bio }, { name: 'Hazard', count: processingCounts.hazard }, { name: 'Wet', count: processingCounts.wet }, { name: 'Dry', count: processingCounts.dry }]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" isAnimationActive animationDuration={600}>
                    <Cell fill="url(#gradientBio)" />
                    <Cell fill="url(#gradientHazard)" />
                    <Cell fill="url(#gradientWet)" />
                    <Cell fill="url(#gradientDry)" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          })}>
            {processingCounts.total === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] w-full opacity-50">
                <BarChart2 className="animate-bounce text-blue-500 mb-2" size={32} />
                <p className="text-xs font-mono uppercase tracking-widest">No Data Yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[{ name: 'Bio', count: processingCounts.bio }, { name: 'Hazard', count: processingCounts.hazard }, { name: 'Wet', count: processingCounts.wet }, { name: 'Dry', count: processingCounts.dry }]}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Bar dataKey="count" isAnimationActive animationDuration={600} animationEasing="ease-out">
                    <Cell fill="url(#gradientBio)" />
                    <Cell fill="url(#gradientHazard)" />
                    <Cell fill="url(#gradientWet)" />
                    <Cell fill="url(#gradientDry)" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* 3. Detections Trend (Line) with Glow */}
          <ChartCard title="Latest Trends" theme={theme} onClick={() => setExpandedGraph({
            title: 'Detections Trend', graphId: 'line', chart: (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="bio" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', filter: 'drop-shadow(0 0 4px #10b981)' }} isAnimationActive animationDuration={800} />
                  <Line type="monotone" dataKey="hazard" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444', filter: 'drop-shadow(0 0 4px #ef4444)' }} isAnimationActive animationDuration={800} />
                  <Line type="monotone" dataKey="wet" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', filter: 'drop-shadow(0 0 4px #3b82f6)' }} isAnimationActive animationDuration={800} />
                  <Line type="monotone" dataKey="dry" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', filter: 'drop-shadow(0 0 4px #f59e0b)' }} isAnimationActive animationDuration={800} />
                </LineChart>
              </ResponsiveContainer>
            )
          })}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="time" fontSize={10} />
                <YAxis fontSize={10} />
                <Line type="monotone" dataKey="bio" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive animationDuration={600} />
                <Line type="monotone" dataKey="hazard" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive animationDuration={600} />
                <Line type="monotone" dataKey="wet" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive animationDuration={600} />
                <Line type="monotone" dataKey="dry" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive animationDuration={600} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 4. Cumulative Area Chart (Span 2) */}
          <ChartCard title="Cumulative Processing" theme={theme} className="lg:col-span-2" onClick={() => setExpandedGraph({
            title: 'Cumulative Processing', graphId: 'area', chart: (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="bio" stackId="1" fill="url(#gradientBio)" stroke="#10b981" isAnimationActive animationDuration={800} />
                  <Area type="monotone" dataKey="hazard" stackId="1" fill="url(#gradientHazard)" stroke="#ef4444" isAnimationActive animationDuration={800} />
                  <Area type="monotone" dataKey="wet" stackId="1" fill="url(#gradientWet)" stroke="#3b82f6" isAnimationActive animationDuration={800} />
                  <Area type="monotone" dataKey="dry" stackId="1" fill="url(#gradientDry)" stroke="#f59e0b" isAnimationActive animationDuration={800} />
                </AreaChart>
              </ResponsiveContainer>
            )
          })}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="time" fontSize={10} />
                <YAxis fontSize={10} />
                <Area type="monotone" dataKey="bio" stackId="1" fill="url(#gradientBio)" fillOpacity={0.6} stroke="#10b981" isAnimationActive animationDuration={600} />
                <Area type="monotone" dataKey="hazard" stackId="1" fill="url(#gradientHazard)" fillOpacity={0.6} stroke="#ef4444" isAnimationActive animationDuration={600} />
                <Area type="monotone" dataKey="wet" stackId="1" fill="url(#gradientWet)" fillOpacity={0.6} stroke="#3b82f6" isAnimationActive animationDuration={600} />
                <Area type="monotone" dataKey="dry" stackId="1" fill="url(#gradientDry)" fillOpacity={0.6} stroke="#f59e0b" isAnimationActive animationDuration={600} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 5. AI Confidence Scatter with Glow */}
          <ChartCard title="AI Confidence" theme={theme} onClick={() => setExpandedGraph({
            title: 'AI Confidence Distribution', chart: (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" name="Time" />
                  <YAxis dataKey="confidence" name="Confidence" domain={[0, 100]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={confidenceHistory} fill="#8b5cf6" isAnimationActive animationDuration={600}>
                    {confidenceHistory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.confidence > 80 ? '#10b981' : entry.confidence > 50 ? '#f59e0b' : '#ef4444'} style={{ filter: 'drop-shadow(0 0 3px rgba(139, 92, 246, 0.5))' }} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            )
          })}>
            <ResponsiveContainer width="100%" height={200}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="time" fontSize={10} />
                <YAxis dataKey="confidence" domain={[0, 100]} fontSize={10} />
                <Scatter data={confidenceHistory} isAnimationActive animationDuration={600}>
                  {confidenceHistory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.confidence > 80 ? '#10b981' : entry.confidence > 50 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 6. Hourly Stacked Bar Chart (NEW - Phase 3) */}
          <ChartCard title="Hourly Breakdown" theme={theme} className="lg:col-span-2" onClick={() => setExpandedGraph({
            title: 'Hourly Processing Breakdown', chart: (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="bio" stackId="a" fill="url(#gradientBio)" name="Bio-medical" isAnimationActive animationDuration={600} />
                  <Bar dataKey="hazard" stackId="a" fill="url(#gradientHazard)" name="Hazardous" isAnimationActive animationDuration={600} />
                  <Bar dataKey="wet" stackId="a" fill="url(#gradientWet)" name="Wet Waste" isAnimationActive animationDuration={600} />
                  <Bar dataKey="dry" stackId="a" fill="url(#gradientDry)" name="Dry Waste" isAnimationActive animationDuration={600} />
                </BarChart>
              </ResponsiveContainer>
            )
          })}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="label" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Bar dataKey="bio" stackId="a" fill="url(#gradientBio)" isAnimationActive animationDuration={600} />
                <Bar dataKey="hazard" stackId="a" fill="url(#gradientHazard)" isAnimationActive animationDuration={600} />
                <Bar dataKey="wet" stackId="a" fill="url(#gradientWet)" isAnimationActive animationDuration={600} />
                <Bar dataKey="dry" stackId="a" fill="url(#gradientDry)" isAnimationActive animationDuration={600} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 7. Comparison Mode (Current vs. Historical Average) */}
          <ChartCard title="Current vs. Average" theme={theme} onClick={() => setShowComparisonMode(true)}>
            <div className="flex flex-col gap-4">
              {(() => {
                const avg = getHistoricalAverages();
                return (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-xs opacity-70">Bio-medical</span>
                      <div className="flex gap-2 text-sm font-mono">
                        <span className="text-green-400">{processingCounts.bio}</span>
                        <span className="opacity-50">vs</span>
                        <span className="text-slate-400">{avg.bio}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs opacity-70">Hazardous</span>
                      <div className="flex gap-2 text-sm font-mono">
                        <span className="text-red-400">{processingCounts.hazard}</span>
                        <span className="opacity-50">vs</span>
                        <span className="text-slate-400">{avg.hazard}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs opacity-70">Wet Waste</span>
                      <div className="flex gap-2 text-sm font-mono">
                        <span className="text-blue-400">{processingCounts.wet}</span>
                        <span className="opacity-50">vs</span>
                        <span className="text-slate-400">{avg.wet}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs opacity-70">Dry Waste</span>
                      <div className="flex gap-2 text-sm font-mono">
                        <span className="text-amber-400">{processingCounts.dry}</span>
                        <span className="opacity-50">vs</span>
                        <span className="text-slate-400">{avg.dry}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-700 flex justify-between items-center">
                      <span className="text-xs font-bold">TOTAL</span>
                      <div className="flex gap-2 text-lg font-mono font-bold">
                        <span className="text-white">{processingCounts.total}</span>
                        <span className="opacity-50">vs</span>
                        <span className="text-slate-400">{avg.total}</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </ChartCard>
        </div>
      </div>
    </div>

        {/* Notifications overlay (if enabled) */ }
  {
    notificationEnabled && <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg text-xs font-bold animate-bounce hidden">
      Notifications Active
    </div>
  }

      </div >
      );
}

export default App;
