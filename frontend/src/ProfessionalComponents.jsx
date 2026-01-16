import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Command, Settings, Bell, Clock, Wifi, WifiOff,
    Power, Pause, Play, Moon, Sun, X, Check, Trash2,
    ChevronRight, Zap, Activity, TrendingUp, AlertTriangle
} from 'lucide-react';
import clsx from 'clsx';
import { LiveIndicator, AnimatedCounter } from './UIComponents';

// ============================================
// PROFESSIONAL HEADER BAR
// Modern header with branding, quick stats, and controls
// ============================================
export const HeaderBar = ({
    theme,
    toggleTheme,
    isConnected,
    isOn,
    isPaused,
    totalItems = 0,
    sessionTime = '00:00:00',
    onOpenSettings,
    onOpenNotifications,
    notificationCount = 0,
    onOpenCommandPalette
}) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <header className={clsx(
            "fixed top-0 left-0 right-0 z-50 px-4 py-2",
            "backdrop-blur-xl border-b",
            theme === 'dark'
                ? "bg-slate-900/80 border-slate-700/50"
                : "bg-white/80 border-slate-200"
        )}>
            <div className="flex items-center justify-between max-w-[2000px] mx-auto">
                {/* Left: Logo & Branding */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center">
                            <Zap size={18} className="text-white" />
                        </div>
                        <div>
                            <h1 className="font-display font-bold text-lg leading-tight">
                                <span className="gradient-text">Waste</span>
                                <span className={theme === 'dark' ? 'text-white' : 'text-slate-800'}>AI</span>
                            </h1>
                            <p className={clsx("text-[10px] -mt-1", theme === 'dark' ? 'text-slate-500' : 'text-slate-400')}>
                                Smart Classification
                            </p>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="hidden md:flex items-center gap-1 ml-6">
                        <div className="quick-stat-item">
                            <LiveIndicator isLive={isConnected} label={isConnected ? 'Connected' : 'Offline'} />
                        </div>
                        <div className={clsx(
                            "quick-stat-item px-3 py-1 rounded-full text-xs font-medium",
                            isOn
                                ? isPaused
                                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                        )}>
                            {isOn ? (isPaused ? '⏸ Paused' : '● Active') : '○ Off'}
                        </div>
                        <div className={clsx(
                            "quick-stat-item px-3 py-1 rounded-full text-xs",
                            theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                        )}>
                            <span className="font-mono-stats font-bold">{totalItems}</span>
                            <span className="ml-1 text-slate-500">items</span>
                        </div>
                    </div>
                </div>

                {/* Right: Controls */}
                <div className="flex items-center gap-2">
                    {/* Command Palette Trigger */}
                    <button
                        onClick={onOpenCommandPalette}
                        className={clsx(
                            "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all",
                            theme === 'dark'
                                ? "bg-slate-800 hover:bg-slate-700 text-slate-400"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-500"
                        )}
                    >
                        <Search size={14} />
                        <span className="hidden lg:inline">Quick Actions</span>
                        <kbd className={clsx(
                            "px-1.5 py-0.5 rounded text-[10px] font-mono",
                            theme === 'dark' ? "bg-slate-700 text-slate-400" : "bg-slate-200 text-slate-500"
                        )}>⌘K</kbd>
                    </button>

                    {/* Clock */}
                    <div className={clsx(
                        "hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm",
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    )}>
                        <Clock size={14} />
                        <span className="font-mono-stats">
                            {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>

                    {/* Notifications */}
                    <button
                        onClick={onOpenNotifications}
                        className={clsx(
                            "relative p-2 rounded-lg transition-all btn-ripple",
                            theme === 'dark' ? "hover:bg-slate-800" : "hover:bg-slate-100"
                        )}
                    >
                        <Bell size={18} className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} />
                        {notificationCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                {notificationCount > 9 ? '9+' : notificationCount}
                            </span>
                        )}
                    </button>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className={clsx(
                            "p-2 rounded-lg transition-all btn-ripple",
                            theme === 'dark' ? "hover:bg-slate-800" : "hover:bg-slate-100"
                        )}
                    >
                        {theme === 'dark'
                            ? <Sun size={18} className="text-amber-400" />
                            : <Moon size={18} className="text-slate-500" />
                        }
                    </button>

                    {/* Settings */}
                    <button
                        onClick={onOpenSettings}
                        className={clsx(
                            "p-2 rounded-lg transition-all btn-ripple",
                            theme === 'dark' ? "hover:bg-slate-800" : "hover:bg-slate-100"
                        )}
                    >
                        <Settings size={18} className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} />
                    </button>
                </div>
            </div>
        </header>
    );
};

// ============================================
// STATUS BAR (FOOTER)
// Bottom bar showing system health and quick info
// ============================================
export const StatusBar = ({
    theme,
    isConnected,
    lastDetection,
    sessionTime,
    totalItems,
    cameraConnected = false
}) => {
    return (
        <footer className={clsx(
            "fixed bottom-0 left-0 right-0 z-40 px-4 py-1.5",
            "backdrop-blur-xl border-t",
            theme === 'dark'
                ? "bg-slate-900/80 border-slate-700/50"
                : "bg-white/80 border-slate-200"
        )}>
            <div className="flex items-center justify-between max-w-[2000px] mx-auto text-xs">
                {/* Left: Connection Status */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        {isConnected ? (
                            <Wifi size={12} className="text-emerald-400" />
                        ) : (
                            <WifiOff size={12} className="text-rose-400" />
                        )}
                        <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
                            {isConnected ? 'Backend Connected' : 'Backend Disconnected'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Activity size={12} className={cameraConnected ? 'text-emerald-400' : 'text-rose-400'} />
                        <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
                            {cameraConnected ? 'Camera Active' : 'Camera Offline'}
                        </span>
                    </div>
                </div>

                {/* Center: Last Detection */}
                <div className={clsx(
                    "hidden sm:flex items-center gap-2",
                    theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                )}>
                    <span>Last detection:</span>
                    <span className="font-mono-stats">{lastDetection || 'None yet'}</span>
                </div>

                {/* Right: Session Info */}
                <div className="flex items-center gap-4">
                    <div className={clsx(
                        "flex items-center gap-2",
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    )}>
                        <Clock size={12} />
                        <span className="font-mono-stats">{sessionTime}</span>
                    </div>
                    <div className={clsx(
                        "flex items-center gap-2 font-medium",
                        theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'
                    )}>
                        <TrendingUp size={12} />
                        <span className="font-mono-stats">{totalItems} items</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

// ============================================
// COMMAND PALETTE (Ctrl+K)
// Spotlight-style quick action search
// ============================================
export const CommandPalette = ({
    isOpen,
    onClose,
    theme,
    onAction
}) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);

    const commands = [
        { id: 'toggle-power', label: 'Toggle Power', icon: Power, category: 'System', shortcut: 'Space' },
        { id: 'toggle-pause', label: 'Toggle Pause', icon: Pause, category: 'System', shortcut: 'P' },
        { id: 'open-settings', label: 'Open Settings', icon: Settings, category: 'Navigation', shortcut: 'S' },
        { id: 'toggle-theme', label: 'Toggle Theme', icon: Sun, category: 'Appearance', shortcut: 'T' },
        { id: 'reset-session', label: 'Reset Session', icon: Trash2, category: 'Data', shortcut: 'R' },
        { id: 'export-data', label: 'Export Data', icon: TrendingUp, category: 'Data' },
        { id: 'fullscreen', label: 'Toggle Fullscreen', icon: Activity, category: 'View', shortcut: 'F' },
    ];

    const filteredCommands = query
        ? commands.filter(cmd =>
            cmd.label.toLowerCase().includes(query.toLowerCase()) ||
            cmd.category.toLowerCase().includes(query.toLowerCase())
        )
        : commands;

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
            } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
                e.preventDefault();
                onAction(filteredCommands[selectedIndex].id);
                onClose();
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredCommands, selectedIndex, onAction, onClose]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className={clsx(
                        "w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden",
                        theme === 'dark'
                            ? "bg-slate-900 border-slate-700"
                            : "bg-white border-slate-200"
                    )}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Search Input */}
                    <div className={clsx(
                        "flex items-center gap-3 px-4 py-3 border-b",
                        theme === 'dark' ? "border-slate-700" : "border-slate-200"
                    )}>
                        <Search size={20} className={theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
                            placeholder="Type a command or search..."
                            className={clsx(
                                "flex-1 bg-transparent outline-none text-lg",
                                theme === 'dark' ? 'text-white placeholder:text-slate-500' : 'text-slate-800 placeholder:text-slate-400'
                            )}
                        />
                        <kbd className={clsx(
                            "px-2 py-1 rounded text-xs font-mono",
                            theme === 'dark' ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
                        )}>ESC</kbd>
                    </div>

                    {/* Command List */}
                    <div className="max-h-80 overflow-y-auto py-2">
                        {filteredCommands.length === 0 ? (
                            <div className={clsx(
                                "px-4 py-8 text-center",
                                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                            )}>
                                No commands found
                            </div>
                        ) : (
                            filteredCommands.map((cmd, i) => (
                                <button
                                    key={cmd.id}
                                    onClick={() => { onAction(cmd.id); onClose(); }}
                                    className={clsx(
                                        "w-full flex items-center gap-3 px-4 py-2.5 transition-all",
                                        i === selectedIndex
                                            ? theme === 'dark' ? "bg-slate-800" : "bg-slate-100"
                                            : "hover:bg-slate-800/50"
                                    )}
                                >
                                    <cmd.icon size={18} className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} />
                                    <span className={clsx(
                                        "flex-1 text-left",
                                        theme === 'dark' ? 'text-white' : 'text-slate-800'
                                    )}>
                                        {cmd.label}
                                    </span>
                                    <span className={clsx(
                                        "text-xs",
                                        theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                                    )}>
                                        {cmd.category}
                                    </span>
                                    {cmd.shortcut && (
                                        <kbd className={clsx(
                                            "px-1.5 py-0.5 rounded text-[10px] font-mono",
                                            theme === 'dark' ? "bg-slate-700 text-slate-400" : "bg-slate-200 text-slate-500"
                                        )}>{cmd.shortcut}</kbd>
                                    )}
                                    <ChevronRight size={14} className={theme === 'dark' ? 'text-slate-600' : 'text-slate-300'} />
                                </button>
                            ))
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// ============================================
// NOTIFICATION CENTER
// Slide-in panel for notification history
// ============================================
export const NotificationCenter = ({
    isOpen,
    onClose,
    theme,
    notifications = [],
    onClearAll,
    onMarkRead
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] bg-black/40"
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, x: 300 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 300 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={clsx(
                            "fixed top-0 right-0 bottom-0 w-full max-w-sm z-[160] shadow-2xl border-l",
                            theme === 'dark'
                                ? "bg-slate-900 border-slate-700"
                                : "bg-white border-slate-200"
                        )}
                    >
                        {/* Header */}
                        <div className={clsx(
                            "flex items-center justify-between px-4 py-3 border-b",
                            theme === 'dark' ? "border-slate-700" : "border-slate-200"
                        )}>
                            <h3 className={clsx(
                                "font-bold text-lg",
                                theme === 'dark' ? 'text-white' : 'text-slate-800'
                            )}>
                                Notifications
                            </h3>
                            <div className="flex items-center gap-2">
                                {notifications.length > 0 && (
                                    <button
                                        onClick={onClearAll}
                                        className={clsx(
                                            "text-xs px-2 py-1 rounded transition-all",
                                            theme === 'dark'
                                                ? "text-slate-400 hover:bg-slate-800"
                                                : "text-slate-500 hover:bg-slate-100"
                                        )}
                                    >
                                        Clear all
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className={clsx(
                                        "p-1 rounded-lg transition-all",
                                        theme === 'dark' ? "hover:bg-slate-800" : "hover:bg-slate-100"
                                    )}
                                >
                                    <X size={20} className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} />
                                </button>
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="overflow-y-auto h-[calc(100%-56px)]">
                            {notifications.length === 0 ? (
                                <div className={clsx(
                                    "flex flex-col items-center justify-center h-full",
                                    theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                                )}>
                                    <Bell size={48} className="mb-3 opacity-50" />
                                    <p>No notifications yet</p>
                                </div>
                            ) : (
                                <div className="p-2 space-y-2">
                                    {notifications.map((notif, i) => (
                                        <motion.div
                                            key={notif.id || i}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className={clsx(
                                                "p-3 rounded-xl border transition-all",
                                                notif.read
                                                    ? theme === 'dark' ? "bg-slate-800/50 border-slate-700/50" : "bg-slate-50 border-slate-100"
                                                    : theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200",
                                                "hover:scale-[1.01]"
                                            )}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={clsx(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center",
                                                    notif.type === 'success' ? "bg-emerald-500/20 text-emerald-400" :
                                                        notif.type === 'warning' ? "bg-amber-500/20 text-amber-400" :
                                                            notif.type === 'error' ? "bg-rose-500/20 text-rose-400" :
                                                                "bg-cyan-500/20 text-cyan-400"
                                                )}>
                                                    {notif.type === 'warning' ? <AlertTriangle size={16} /> :
                                                        notif.type === 'success' ? <Check size={16} /> :
                                                            <Bell size={16} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={clsx(
                                                        "text-sm font-medium truncate",
                                                        theme === 'dark' ? 'text-white' : 'text-slate-800'
                                                    )}>
                                                        {notif.title}
                                                    </p>
                                                    <p className={clsx(
                                                        "text-xs mt-0.5",
                                                        theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                                                    )}>
                                                        {notif.message}
                                                    </p>
                                                    <p className={clsx(
                                                        "text-[10px] mt-1",
                                                        theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                                                    )}>
                                                        {notif.time}
                                                    </p>
                                                </div>
                                                {!notif.read && (
                                                    <button
                                                        onClick={() => onMarkRead(notif.id)}
                                                        className="p-1 hover:bg-slate-700/50 rounded"
                                                    >
                                                        <Check size={14} className="text-slate-500" />
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default { HeaderBar, StatusBar, CommandPalette, NotificationCenter };
