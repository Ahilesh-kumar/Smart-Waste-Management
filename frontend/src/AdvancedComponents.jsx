import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { GripVertical, X, RotateCcw, Recycle, AlertTriangle, Activity, Trash2 } from 'lucide-react';

// ===== DRAGGABLE WIDGET =====
// Individual draggable widget with drag handle
export const DraggableWidget = ({
    id,
    children,
    onDragEnd,
    className = ''
}) => {
    const dragControls = useDragControls();

    return (
        <motion.div
            layoutId={id}
            drag
            dragControls={dragControls}
            dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
            dragElastic={0.1}
            whileDrag={{ scale: 1.02, zIndex: 50, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
            onDragEnd={onDragEnd}
            className={`relative group ${className}`}
        >
            {/* Drag Handle */}
            <div
                className="absolute -top-2 -right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                onPointerDown={(e) => dragControls.start(e)}
            >
                <div className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 cursor-grab active:cursor-grabbing shadow-lg">
                    <GripVertical size={14} className="text-slate-300" />
                </div>
            </div>
            {children}
        </motion.div>
    );
};

// ===== LIVE ACTIVITY FEED =====
// Real-time scrolling detection feed
export const LiveActivityFeed = ({ events = [], maxItems = 5, onClose }) => {
    const getCategoryStyle = (category) => {
        switch (category) {
            case 'Bio-medical':
                return { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-400', icon: Recycle };
            case 'Hazardous':
                return { bg: 'bg-rose-500/20', border: 'border-rose-500/50', text: 'text-rose-400', icon: AlertTriangle };
            case 'Wet Waste':
                return { bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', text: 'text-cyan-400', icon: Activity };
            case 'Dry Waste':
                return { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-400', icon: Trash2 };
            default:
                return { bg: 'bg-slate-500/20', border: 'border-slate-500/50', text: 'text-slate-400', icon: Activity };
        }
    };

    return (
        <div className="fixed right-4 top-24 z-40 w-72 space-y-2">
            <AnimatePresence mode="popLayout">
                {events.slice(-maxItems).map((event, index) => {
                    const style = getCategoryStyle(event.category);
                    const Icon = style.icon;

                    return (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: 100, scale: 0.8 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 100, scale: 0.8 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className={`p-3 rounded-xl backdrop-blur-xl border ${style.bg} ${style.border} shadow-lg`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center`}>
                                    <Icon size={16} className={style.text} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className={`font-semibold text-sm truncate ${style.text}`}>
                                        {event.rawClass || event.category}
                                    </div>
                                    <div className="text-xs text-slate-400 flex justify-between">
                                        <span>{event.time}</span>
                                        <span>{event.confidence}%</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

// ===== SWIPE HANDLER HOOK =====
// Detects swipe gestures on touch devices
export const useSwipeGesture = (options = {}) => {
    const {
        onSwipeLeft,
        onSwipeRight,
        onSwipeUp,
        onSwipeDown,
        onPullRefresh,
        threshold = 50,
        pullRefreshThreshold = 100
    } = options;

    const touchStart = useRef({ x: 0, y: 0 });
    const touchEnd = useRef({ x: 0, y: 0 });
    const [isPulling, setIsPulling] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);

    const handleTouchStart = useCallback((e) => {
        touchStart.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
        touchEnd.current = { ...touchStart.current };
    }, []);

    const handleTouchMove = useCallback((e) => {
        touchEnd.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };

        // Pull to refresh detection
        const deltaY = touchEnd.current.y - touchStart.current.y;
        if (deltaY > 0 && window.scrollY === 0 && onPullRefresh) {
            setIsPulling(true);
            setPullDistance(Math.min(deltaY, pullRefreshThreshold * 1.5));
        }
    }, [onPullRefresh, pullRefreshThreshold]);

    const handleTouchEnd = useCallback(() => {
        const deltaX = touchEnd.current.x - touchStart.current.x;
        const deltaY = touchEnd.current.y - touchStart.current.y;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        // Pull to refresh
        if (isPulling && pullDistance >= pullRefreshThreshold) {
            onPullRefresh?.();
        }
        setIsPulling(false);
        setPullDistance(0);

        // Swipe detection
        if (absX > absY && absX > threshold) {
            if (deltaX > 0) {
                onSwipeRight?.();
            } else {
                onSwipeLeft?.();
            }
        } else if (absY > absX && absY > threshold) {
            if (deltaY > 0) {
                onSwipeDown?.();
            } else {
                onSwipeUp?.();
            }
        }
    }, [isPulling, pullDistance, pullRefreshThreshold, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onPullRefresh]);

    const swipeProps = {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd
    };

    return { swipeProps, isPulling, pullDistance };
};

// ===== PULL TO REFRESH INDICATOR =====
export const PullRefreshIndicator = ({ pullDistance, threshold = 100 }) => {
    const progress = Math.min(pullDistance / threshold, 1);
    const isReady = progress >= 1;

    return (
        <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{
                opacity: pullDistance > 10 ? 1 : 0,
                y: pullDistance > 10 ? 0 : -50,
                scale: isReady ? 1.1 : 1
            }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
        >
            <div className={`px-4 py-2 rounded-full backdrop-blur-xl border ${isReady ? 'bg-teal-500/20 border-teal-500/50' : 'bg-slate-800/80 border-slate-700'} shadow-lg`}>
                <div className="flex items-center gap-2">
                    <motion.div
                        animate={{ rotate: progress * 360 }}
                        transition={{ duration: 0 }}
                    >
                        <RotateCcw size={16} className={isReady ? 'text-teal-400' : 'text-slate-400'} />
                    </motion.div>
                    <span className={`text-xs font-semibold ${isReady ? 'text-teal-400' : 'text-slate-400'}`}>
                        {isReady ? 'Release to refresh' : 'Pull to refresh'}
                    </span>
                </div>
            </div>
        </motion.div>
    );
};

// ===== SWIPEABLE TABS =====
export const SwipeableTabs = ({ tabs, activeTab, onTabChange, children }) => {
    const containerRef = useRef(null);

    const { swipeProps } = useSwipeGesture({
        onSwipeLeft: () => {
            const currentIndex = tabs.indexOf(activeTab);
            if (currentIndex < tabs.length - 1) {
                onTabChange(tabs[currentIndex + 1]);
            }
        },
        onSwipeRight: () => {
            const currentIndex = tabs.indexOf(activeTab);
            if (currentIndex > 0) {
                onTabChange(tabs[currentIndex - 1]);
            }
        },
        threshold: 80
    });

    return (
        <div ref={containerRef} {...swipeProps} className="touch-pan-y">
            {/* Tab Indicators */}
            <div className="flex justify-center gap-2 mb-4">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => onTabChange(tab)}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${activeTab === tab
                                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content with swipe animation */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.2 }}
                >
                    {children}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

// ===== LAYOUT MANAGER =====
// Manages draggable widget positions with localStorage persistence
export const useLayoutManager = (initialLayout = [], storageKey = 'dashboard-layout') => {
    const [layout, setLayout] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved ? JSON.parse(saved) : initialLayout;
        } catch {
            return initialLayout;
        }
    });

    const updateLayout = useCallback((widgetId, newPosition) => {
        setLayout(prev => {
            const updated = prev.map(item =>
                item.id === widgetId ? { ...item, ...newPosition } : item
            );
            localStorage.setItem(storageKey, JSON.stringify(updated));
            return updated;
        });
    }, [storageKey]);

    const resetLayout = useCallback(() => {
        setLayout(initialLayout);
        localStorage.removeItem(storageKey);
    }, [initialLayout, storageKey]);

    const addWidget = useCallback((widget) => {
        setLayout(prev => {
            const updated = [...prev, widget];
            localStorage.setItem(storageKey, JSON.stringify(updated));
            return updated;
        });
    }, [storageKey]);

    const removeWidget = useCallback((widgetId) => {
        setLayout(prev => {
            const updated = prev.filter(item => item.id !== widgetId);
            localStorage.setItem(storageKey, JSON.stringify(updated));
            return updated;
        });
    }, [storageKey]);

    return { layout, updateLayout, resetLayout, addWidget, removeWidget };
};
