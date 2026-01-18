import React, { useState, useEffect } from 'react';
import { Responsive } from 'react-grid-layout';
import { WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import clsx from 'clsx';
import { Settings, X, Plus, RotateCcw, Save, BarChart3, Type, Trash2 } from 'lucide-react';

// Reuse existing widgets
import { SystemControlWidget } from './widgets/SystemControlWidget';
import { StatsOverviewWidget } from './widgets/StatsOverviewWidget';
import { BinStatusWidget } from './widgets/BinStatusWidget';
import { LiveFeedWidget } from './widgets/LiveFeedWidget';
import { DetectionLogWidget } from './widgets/DetectionLogWidget';
import { MechanismControlWidget } from './widgets/MechanismControlWidget';
// Split analytics widgets
import { WasteCompositionWidget } from './widgets/WasteCompositionWidget';
import { ThroughputVelocityWidget } from './widgets/ThroughputVelocityWidget';
import { SessionCompareWidget } from './widgets/SessionCompareWidget';

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

        // BOTTOM ROW - Split analytics charts (4 units each)
        { i: 'waste_composition', x: 0, y: 9, w: 4, h: 3, minW: 3, minH: 2 },
        { i: 'throughput_velocity', x: 4, y: 9, w: 4, h: 3, minW: 3, minH: 2 },
        { i: 'session_compare', x: 8, y: 9, w: 4, h: 3, minW: 3, minH: 2 }
    ]
};

const WIDGET_TITLES = {
    sys_control: 'System Control',
    stats: 'Key Metrics',
    bins: 'Bin Status',
    live_feed: 'Camera Feed',
    logs: 'Recent Detections',
    mech_control: 'Mechanism Controls',
    waste_composition: 'Waste Composition',
    throughput_velocity: 'Throughput Velocity',
    session_compare: 'Session vs Average'
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

    // Multiple Text Labels (draggable)
    const [textLabels, setTextLabels] = useState(() => {
        try {
            const saved = localStorage.getItem('simple_dashboard_text_labels');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    // New text label input
    const [newLabelText, setNewLabelText] = useState('');

    // Save Effects
    useEffect(() => {
        localStorage.setItem('simple_dashboard_layout', JSON.stringify(layouts));
    }, [layouts]);

    useEffect(() => {
        localStorage.setItem('simple_dashboard_hidden', JSON.stringify(hiddenWidgets));
    }, [hiddenWidgets]);

    // Save text labels
    useEffect(() => {
        localStorage.setItem('simple_dashboard_text_labels', JSON.stringify(textLabels));
    }, [textLabels]);

    // Helpers
    const resetLayout = () => {
        setLayouts(DEFAULT_LAYOUTS);
        setHiddenWidgets([]);
        setTextLabels([]);
        if (onLayoutReset) onLayoutReset();
    };

    const addTextLabel = () => {
        if (!newLabelText.trim()) return;
        const newLabel = {
            id: `text_${Date.now()}`,
            text: newLabelText.trim()
        };
        // Add to labels
        setTextLabels(prev => [...prev, newLabel]);
        // Add to layout
        setLayouts(prev => ({
            ...prev,
            lg: [
                ...prev.lg,
                { i: newLabel.id, x: 0, y: 0, w: 6, h: 1, minW: 3, minH: 1 }
            ]
        }));
        setNewLabelText('');
    };

    const removeTextLabel = (labelId) => {
        setTextLabels(prev => prev.filter(l => l.id !== labelId));
        setLayouts(prev => ({
            ...prev,
            lg: prev.lg.filter(item => item.i !== labelId)
        }));
    };

    const toggleWidget = (id) => {
        setHiddenWidgets(prev =>
            prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
        );
    };

    const renderWidget = (id) => {
        // Check if it's a text label
        if (id.startsWith('text_')) {
            const label = textLabels.find(l => l.id === id);
            return label ? (
                <div className="flex items-center gap-3 h-full p-4">
                    <BarChart3 size={20} className="text-cyan-500 flex-shrink-0" />
                    <h3 className="text-xl font-black text-white tracking-tight">{label.text}</h3>
                    <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/50 to-transparent" />
                </div>
            ) : null;
        }

        switch (id) {
            case 'sys_control': return <SystemControlWidget theme={theme} {...props} />;
            case 'stats': return <StatsOverviewWidget theme={theme} {...props} />;
            case 'bins': return <BinStatusWidget theme={theme} {...props} />;
            case 'live_feed': return <LiveFeedWidget theme={theme} {...props} />;
            case 'mech_control': return <MechanismControlWidget theme={theme} {...props} />;
            case 'logs': return <DetectionLogWidget theme={theme} {...props} />;
            case 'waste_composition': return <WasteCompositionWidget theme={theme} {...props} />;
            case 'throughput_velocity': return <ThroughputVelocityWidget theme={theme} {...props} />;
            case 'session_compare': return <SessionCompareWidget theme={theme} {...props} />;
            default: return null;
        }
    };

    // Filter active items
    const activeLayout = layouts.lg.filter(item => !hiddenWidgets.includes(item.i));

    return (
        <div className="relative min-h-screen">
            {/* Custom resize handle styles */}
            <style>{`
                .react-resizable-handle {
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    background: transparent;
                    z-index: 100;
                }
                .react-resizable-handle::after {
                    content: '';
                    position: absolute;
                    right: 3px;
                    bottom: 3px;
                    width: 8px;
                    height: 8px;
                    border-right: 3px solid rgba(45, 212, 191, 0.8);
                    border-bottom: 3px solid rgba(45, 212, 191, 0.8);
                    border-radius: 0 0 4px 0;
                    transition: all 0.2s ease;
                }
                .react-resizable-handle:hover::after {
                    border-color: #2dd4bf;
                    transform: scale(1.2);
                }
                .react-resizable-handle-se { bottom: 0; right: 0; cursor: se-resize; }
                .react-resizable-handle-sw { bottom: 0; left: 0; cursor: sw-resize; transform: rotate(90deg); }
                .react-resizable-handle-ne { top: 0; right: 0; cursor: ne-resize; transform: rotate(-90deg); }
                .react-resizable-handle-nw { top: 0; left: 0; cursor: nw-resize; transform: rotate(180deg); }
            `}</style>

            {/* Edit Mode Toolbar */}
            {isEditMode && (
                <div className="mb-6 p-4 rounded-2xl bg-neutral-900/90 border border-teal-500/30 backdrop-blur-xl animate-in slide-in-from-top-4 flex flex-col gap-4 z-50 relative">
                    {/* Top Row: Title and Reset */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-teal-400 font-bold">
                                <Settings size={20} className="animate-spin-slow" />
                                <span>Customizing Layout</span>
                            </div>
                        </div>

                        <button
                            onClick={resetLayout}
                            className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold text-sm hover:bg-rose-500/20 transition-all flex items-center gap-2 whitespace-nowrap"
                        >
                            <RotateCcw size={16} /> Reset Default
                        </button>
                    </div>

                    {/* Add Text Label Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                            <Type size={18} className="text-cyan-400 flex-shrink-0" />
                            <input
                                type="text"
                                value={newLabelText}
                                onChange={(e) => setNewLabelText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addTextLabel()}
                                placeholder="Add a section title (e.g., Real-Time Analytics)"
                                className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-500 font-bold"
                            />
                            <button
                                onClick={addTextLabel}
                                disabled={!newLabelText.trim()}
                                className={clsx(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                                    newLabelText.trim()
                                        ? "bg-cyan-500 text-black hover:bg-cyan-400"
                                        : "bg-slate-700 text-slate-500 cursor-not-allowed"
                                )}
                            >
                                <Plus size={14} /> Add
                            </button>
                        </div>

                        {/* Existing Text Labels */}
                        {textLabels.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {textLabels.map(label => (
                                    <div
                                        key={label.id}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-400 border border-violet-500/30"
                                    >
                                        <BarChart3 size={12} />
                                        <span className="text-xs font-bold">{label.text}</span>
                                        <button
                                            onClick={() => removeTextLabel(label.id)}
                                            className="p-0.5 hover:bg-violet-500/30 rounded transition-colors"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Widget Toggles */}
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

                    <p className="text-xs text-slate-500">💡 Tip: Drag widgets to reposition. Drag corners to resize. Add text labels above widgets!</p>
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
