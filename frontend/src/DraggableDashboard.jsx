
import React, { useState, useEffect, useCallback } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import clsx from 'clsx';
import { Settings, X, Plus, RotateCcw, Save } from 'lucide-react';
import { SystemControlWidget } from './widgets/SystemControlWidget';
import { StatsOverviewWidget } from './widgets/StatsOverviewWidget';
import { BinStatusWidget } from './widgets/BinStatusWidget';
import { LiveFeedWidget } from './widgets/LiveFeedWidget';
import { AnalyticsDeckWidget } from './widgets/AnalyticsDeckWidget';
import { DetectionLogWidget } from './widgets/DetectionLogWidget';
import { MechanismControlWidget } from './widgets/MechanismControlWidget';

// Responsive Grid Wrapper
const ResponsiveGridLayout = WidthProvider(Responsive);

// Default "Premium" Layout (Matches original hardcoded design)
const DEFAULT_LAYOUTS = {
    lg: [
        // LEFT COLUMN (Previously col-span-8)
        { i: 'live_feed', x: 0, y: 0, w: 8, h: 4, minW: 4, minH: 3 },
        { i: 'mech_control', x: 0, y: 4, w: 8, h: 2, minW: 4, minH: 2 }, // Conveyor & Servos
        { i: 'logs', x: 0, y: 6, w: 8, h: 3, minW: 4, minH: 2 }, // Recent Detections spanning full left width

        // RIGHT COLUMN (Previously col-span-4)
        { i: 'sys_control', x: 8, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
        { i: 'stats', x: 8, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
        { i: 'bins', x: 8, y: 4, w: 4, h: 2, minW: 2, minH: 2 }, // Bin Status below Stats

        // BOTTOM SECTION
        { i: 'analytics', x: 0, y: 9, w: 12, h: 4, minW: 6, minH: 3 }
    ]
};

const WIDGET_TITLES = {
    sys_control: 'System Control',
    stats: 'Key Metrics',
    bins: 'Bin Status',
    live_feed: 'Live Feed',
    logs: 'Recent Detections',
    analytics: 'Analytics Deck',
    mech_control: 'Conveyor & Servos'
};

export const DraggableDashboard = ({
    theme,
    isEditMode = false,
    onSaveLayout,
    onResetLayout,
    ...props // diverse props passed from App.jsx for widgets
}) => {
    // Layout State
    const [layouts, setLayouts] = useState(() => {
        try {
            const saved = localStorage.getItem('waste_dashboard_layout');
            const parsed = saved ? JSON.parse(saved) : null;
            // Validate structure
            if (parsed && parsed.lg && Array.isArray(parsed.lg)) {
                return parsed;
            }
            return DEFAULT_LAYOUTS;
        } catch (e) {
            console.error("Layout parse error:", e);
            return DEFAULT_LAYOUTS;
        }
    });

    // Hidden Widgets State (items removed from grid)
    const [hiddenWidgets, setHiddenWidgets] = useState([]);

    // Save logic
    const handleLayoutChange = (currentLayout, allLayouts) => {
        setLayouts(allLayouts);
        // Auto-save or wait for button? User asked for "Save Changes" button.
        // We will store in state, parent handles persist via onSaveLayout arg if needed, 
        // OR we just sync to local state here and expose a "commit" function.
        // For smoothness, we can auto-save to a temp state, and "Save" commits to localStorage.
    };

    const saveChanges = () => {
        localStorage.setItem('waste_dashboard_layout', JSON.stringify(layouts));
        if (onSaveLayout) onSaveLayout();
    };

    const resetLayout = () => {
        setLayouts(DEFAULT_LAYOUTS);
        setHiddenWidgets([]);
        if (onResetLayout) onResetLayout();
    };

    const removeWidget = (id) => {
        setHiddenWidgets(prev => [...prev, id]);
    };

    const addWidget = (id) => {
        setHiddenWidgets(prev => prev.filter(w => w !== id));
    };

    // Filter layout items based on hidden items
    const activeLayouts = {
        lg: layouts.lg.filter(item => !hiddenWidgets.includes(item.i))
    };

    const renderWidget = (id) => {
        switch (id) {
            case 'sys_control': return <SystemControlWidget theme={theme} {...props} />;
            case 'stats': return <StatsOverviewWidget theme={theme} {...props} />;
            case 'bins': return <BinStatusWidget theme={theme} {...props} />;
            case 'live_feed': return <LiveFeedWidget theme={theme} {...props} />;
            case 'mech_control': return <MechanismControlWidget theme={theme} {...props} />;
            case 'logs': return <DetectionLogWidget theme={theme} {...props} />;
            case 'analytics': return <AnalyticsDeckWidget theme={theme} {...props} />;
            default: return null;
        }
    };

    return (
        <div className="relative">
            {/* Edit Mode Toolbar */}
            {isEditMode && (
                <div className="mb-4 p-4 rounded-xl bg-neutral-900 border border-teal-500/30 flex justify-between items-center animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-4">
                        <div className="text-teal-400 font-bold flex items-center gap-2">
                            <Settings size={18} className="animate-spin-slow" />
                            Customizing Layout
                        </div>
                        {hiddenWidgets.length > 0 && (
                            <div className="flex gap-2">
                                <span className="text-sm text-slate-400 self-center">Add:</span>
                                {hiddenWidgets.map(id => (
                                    <button
                                        key={id}
                                        onClick={() => addWidget(id)}
                                        className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs hover:bg-teal-900 hover:border-teal-500 hover:text-teal-400 transition-all flex items-center gap-1"
                                    >
                                        <Plus size={10} />
                                        {WIDGET_TITLES[id]}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={resetLayout}
                            className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-bold flex items-center gap-2 transition-all"
                        >
                            <RotateCcw size={14} />
                            Reset
                        </button>
                        <button
                            onClick={saveChanges}
                            className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-black text-sm font-bold flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all"
                        >
                            <Save size={14} />
                            Save Changes
                        </button>
                    </div>
                </div>
            )}

            <ResponsiveGridLayout
                className={clsx("layout", isEditMode && "border-2 border-dashed border-white/5 rounded-3xl bg-white/5")}
                layouts={activeLayouts}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={100}
                isDraggable={isEditMode}
                isResizable={isEditMode}
                onLayoutChange={handleLayoutChange}
                margin={[16, 16]}
                containerPadding={[0, 0]}
            >
                {layouts.lg.map(item => {
                    if (hiddenWidgets.includes(item.i)) return null;
                    return (
                        <div key={item.i} className={clsx(
                            "relative group rounded-3xl overflow-hidden transition-shadow duration-300",
                            isEditMode && "ring-2 ring-teal-500/50 cursor-grab active:cursor-grabbing shadow-2xl z-10 hover:ring-teal-400 bg-black/40"
                        )}>
                            {/* Remove Button in Edit Mode */}
                            {isEditMode && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeWidget(item.i); }}
                                    className="absolute top-2 right-2 z-50 p-1.5 rounded-full bg-rose-500 text-white shadow-lg hover:scale-110 hover:bg-rose-400 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <X size={14} />
                                </button>
                            )}

                            {/* Prevent interaction with widget contents while dragging */}
                            <div className={clsx("h-full w-full", isEditMode && "pointer-events-none")}>
                                {renderWidget(item.i)}
                            </div>
                        </div>
                    );
                })}
            </ResponsiveGridLayout>
        </div>
    );
};
