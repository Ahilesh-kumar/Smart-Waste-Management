import React, { useState, useEffect } from 'react';
import { Responsive } from 'react-grid-layout';
import { WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import clsx from 'clsx';
import { Settings, X, Plus, RotateCcw, Save } from 'lucide-react';

// Reuse existing widgets
import { SystemControlWidget } from './widgets/SystemControlWidget';
import { StatsOverviewWidget } from './widgets/StatsOverviewWidget';
import { BinStatusWidget } from './widgets/BinStatusWidget';
import { LiveFeedWidget } from './widgets/LiveFeedWidget';
import { AnalyticsDeckWidget } from './widgets/AnalyticsDeckWidget';
import { DetectionLogWidget } from './widgets/DetectionLogWidget';
import { MechanismControlWidget } from './widgets/MechanismControlWidget';

const ResponsiveGridLayout = WidthProvider(Responsive);


// EXACT Default Layout
const DEFAULT_LAYOUTS = {
    lg: [
        // LEFT COLUMN (8 units wide)
        { i: 'live_feed', x: 0, y: 0, w: 8, h: 4, minW: 4, minH: 3 },
        { i: 'mech_control', x: 0, y: 4, w: 8, h: 2, minW: 4, minH: 2 },
        { i: 'logs', x: 0, y: 6, w: 8, h: 3, minW: 4, minH: 2 },

        // RIGHT COLUMN (4 units wide)
        { i: 'sys_control', x: 8, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
        { i: 'stats', x: 8, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
        { i: 'bins', x: 8, y: 4, w: 4, h: 2, minW: 2, minH: 2 },

        // BOTTOM (12 units wide)
        { i: 'analytics', x: 0, y: 9, w: 12, h: 4, minW: 6, minH: 3 }
    ]
};

const WIDGET_TITLES = {
    sys_control: 'System Control',
    stats: 'Key Metrics',
    bins: 'Bin Status',
    live_feed: 'Camera Feed',
    logs: 'Recent Detections',
    analytics: 'Analytics Deck',
    mech_control: 'Mechanism Controls'
};

export const SimpleDashboard = ({
    theme,
    isEditMode,
    onLayoutSave,
    onLayoutReset,
    ...props
}) => {
    // #region agent log
    React.useEffect(() => {
        fetch('http://127.0.0.1:7242/ingest/c0c5c7b0-5bce-477f-bf1e-04964705fac6', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'SimpleDashboard.jsx:47', message: 'SimpleDashboard component mounted', data: { theme, isEditMode, hasOnLayoutSave: !!onLayoutSave, hasOnLayoutReset: !!onLayoutReset, propsKeys: Object.keys(props) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
    }, []);
    // #endregion

    // State
    const [layouts, setLayouts] = useState(() => {
        try {
            const saved = localStorage.getItem('simple_dashboard_layout');
            return saved ? JSON.parse(saved) : DEFAULT_LAYOUTS;
        } catch (e) {
            console.error("Layout load error", e);
            return DEFAULT_LAYOUTS;
        }
    });

    const [hiddenWidgets, setHiddenWidgets] = useState(() => {
        try {
            const saved = localStorage.getItem('simple_dashboard_hidden');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    // Save Effects
    useEffect(() => {
        localStorage.setItem('simple_dashboard_layout', JSON.stringify(layouts));
    }, [layouts]);

    useEffect(() => {
        localStorage.setItem('simple_dashboard_hidden', JSON.stringify(hiddenWidgets));
    }, [hiddenWidgets]);

    // Helpers
    const resetLayout = () => {
        setLayouts(DEFAULT_LAYOUTS);
        setHiddenWidgets([]);
        if (onLayoutReset) onLayoutReset();
    };

    const toggleWidget = (id) => {
        setHiddenWidgets(prev =>
            prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
        );
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

    // Filter active items
    const activeLayout = layouts.lg.filter(item => !hiddenWidgets.includes(item.i));

    return (
        <div className="relative min-h-screen">
            {/* Edit Mode Toolbar */}
            {isEditMode && (
                <div className="mb-6 p-4 rounded-2xl bg-neutral-900/90 border border-teal-500/30 backdrop-blur-xl animate-in slide-in-from-top-4 flex flex-col md:flex-row justify-between items-center gap-4 z-50 relative">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-teal-400 font-bold">
                            <Settings size={20} className="animate-spin-slow" />
                            <span>Customizing Layout</span>
                        </div>
                        <div className="h-6 w-px bg-white/10 mx-2" />
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(WIDGET_TITLES).map(([id, title]) => (
                                <button
                                    key={id}
                                    onClick={() => toggleWidget(id)}
                                    className={clsx(
                                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-2",
                                        hiddenWidgets.includes(id)
                                            ? "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                                            : "bg-teal-500/20 text-teal-400 border-teal-500/30 shadow-[0_0_10px_rgba(45,212,191,0.1)]"
                                    )}
                                >
                                    {hiddenWidgets.includes(id) ? <Plus size={12} /> : <X size={12} />}
                                    {title}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={resetLayout}
                        className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold text-sm hover:bg-rose-500/20 transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                        <RotateCcw size={16} /> Reset Default
                    </button>
                </div>
            )}

            <ResponsiveGridLayout
                className={clsx("layout", isEditMode && "border-2 border-dashed border-white/10 rounded-3xl bg-white/5")}
                layouts={{ lg: activeLayout }}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={100}
                isDraggable={isEditMode}
                isResizable={isEditMode}
                onLayoutChange={(curr, all) => setLayouts(all)}
                margin={[16, 16]}
                containerPadding={[0, 0]}
                useCSSTransforms={true}
            >
                {activeLayout.map(item => (
                    <div key={item.i} className={clsx(
                        "relative group",
                        // Edit Mode Styles
                        isEditMode && "ring-2 ring-teal-500/50 cursor-move rounded-2xl z-10 bg-black/40 hover:bg-black/60 transition-all shadow-2xl",
                        // Default Styles for Widgets which don't have their own cards (sanity check)
                        !isEditMode && "transition-all duration-300 ease-out"
                    )}>
                        <div className={clsx("h-full w-full", isEditMode && "pointer-events-none opacity-80 scale-95 transition-transform")}>
                            {renderWidget(item.i)}
                        </div>

                        {/* Remove Button Overlay in Edit Mode */}
                        {isEditMode && (
                            <div className="absolute top-2 right-2 flex gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleWidget(item.i); }}
                                    className="p-1.5 bg-rose-500 text-white rounded-full shadow-lg hover:scale-110 transition-transform"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </ResponsiveGridLayout>
        </div>
    );
};
