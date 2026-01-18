
import React from 'react';
import clsx from 'clsx';
import { Activity, Box, Eye, Maximize2 } from 'lucide-react';

// Color mapping for waste classes
const CLASS_COLORS = {
    "Wet Waste": { bg: "bg-cyan-500", text: "text-cyan-400", border: "border-cyan-500/30" },
    "Dry Waste": { bg: "bg-amber-500", text: "text-amber-400", border: "border-amber-500/30" },
    "Hazardous": { bg: "bg-rose-500", text: "text-rose-400", border: "border-rose-500/30" },
    "Bio": { bg: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500/30" },
    "Biodegradable": { bg: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500/30" }
};

const getClassColors = (className) => {
    return CLASS_COLORS[className] || { bg: "bg-slate-500", text: "text-slate-400", border: "border-slate-500/30" };
};

export const DetectionLogWidget = ({ theme, recentDetections = [], detectionHours, onViewDetails }) => {
    return (
        <div className={clsx(
            "h-full rounded-2xl overflow-hidden flex flex-col border",
            theme === 'dark' ? "bg-black/40 border-white/10 backdrop-blur-md" : "bg-white border-slate-200"
        )}>
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h3 className="font-bold text-sm flex items-center gap-2">
                    <Activity size={14} className="text-teal-400" />
                    Recent Detections
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded-full">
                        {recentDetections.length} items
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-teal-500/20 text-teal-400 rounded-full animate-pulse">
                        LIVE
                    </span>
                </div>
            </div>

            {/* Detection List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {recentDetections.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                        <Activity size={24} className="mb-2" />
                        <p className="text-xs">Waiting for items...</p>
                    </div>
                ) : (
                    recentDetections.map((det, i) => {
                        const colors = getClassColors(det.class);
                        const confidence = det.confidence || 0;
                        const confPercent = (confidence * 100).toFixed(0);

                        return (
                            <div
                                key={i}
                                className={clsx(
                                    "p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all border",
                                    colors.border,
                                    "hover:scale-[1.01] cursor-pointer"
                                )}
                            >
                                {/* Top Row: Class + Time */}
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={clsx("w-2 h-2 rounded-full", colors.bg)} />
                                        <span className="text-sm font-bold text-slate-200">{det.class}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono">{det.time}</span>
                                </div>

                                {/* Confidence Bar */}
                                <div className="mb-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Confidence</span>
                                        <span className={clsx("text-xs font-bold", colors.text)}>{confPercent}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                                        <div
                                            className={clsx("h-full rounded-full transition-all duration-500", colors.bg)}
                                            style={{ width: `${confPercent}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Object Details Row */}
                                <div className="flex justify-between items-center text-[10px]">
                                    <div className="flex items-center gap-3 text-slate-500">
                                        {det.box && (
                                            <span className="flex items-center gap-1">
                                                <Box size={10} />
                                                {Math.round(det.box.w || 0)}x{Math.round(det.box.h || 0)}px
                                            </span>
                                        )}
                                        {det.label && (
                                            <span className="px-1.5 py-0.5 bg-slate-700/50 rounded text-slate-400">
                                                {det.label}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {onViewDetails && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onViewDetails(det); }}
                                                className="p-1 hover:bg-white/10 rounded transition-colors"
                                                title="View Details"
                                            >
                                                <Eye size={12} className="text-slate-400 hover:text-teal-400" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer Stats */}
            {recentDetections.length > 0 && (
                <div className="p-3 border-t border-white/5 bg-white/5 flex justify-between items-center text-[10px]">
                    <span className="text-slate-500">
                        Avg Confidence: <span className="text-teal-400 font-bold">
                            {(recentDetections.reduce((sum, d) => sum + (d.confidence || 0), 0) / recentDetections.length * 100).toFixed(0)}%
                        </span>
                    </span>
                    <span className="text-slate-500">
                        {detectionHours ? `Last ${detectionHours}h` : 'Session'}
                    </span>
                </div>
            )}
        </div>
    );
};
