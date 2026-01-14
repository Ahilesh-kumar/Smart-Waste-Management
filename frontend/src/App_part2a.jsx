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

                        {/* Rotation & Torch Control Overlay (Hover) */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                            {/* Center Reticle (Decorative) */}
                            <div className="w-[80%] h-[80%] border border-white/10 rounded-xl relative">
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/30 rounded-tl-xl"></div>
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/30 rounded-tr-xl"></div>
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/30 rounded-bl-xl"></div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/30 rounded-br-xl"></div>
                            </div>
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
