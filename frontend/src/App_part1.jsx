import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { Power, Activity, AlertTriangle, Webcam, Settings, Trash2, Zap, Sun, Moon, TrendingUp, BarChart2, PieChart, Recycle, Clock, ArrowUpRight, Download, BellRing, BellOff, Database, Sliders, X, Info, Scan, WifiOff } from 'lucide-react';
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
        toggleLockRef.current = true;  // Lock to prevent system_state from overwriting isOn

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
