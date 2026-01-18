
import React from 'react';
import clsx from 'clsx';
import { Activity } from 'lucide-react';

export const DetectionLogWidget = ({ theme, recentDetections = [], detectionHours }) => {
    return (
        <div className={clsx(
            "h-full rounded-2xl overflow-hidden flex flex-col border",
            theme === 'dark' ? "bg-black/40 border-white/10 backdrop-blur-md" : "bg-white border-slate-200"
        )}>
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h3 className="font-bold text-sm flex items-center gap-2">
                    <Activity size={14} className="text-teal-400" />
                    Recent Detections
                </h3>
                <span className="text-[10px] px-2 py-0.5 bg-teal-500/20 text-teal-400 rounded-full animate-pulse">
                    LIVE
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {recentDetections.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                        <Activity size={24} className="mb-2" />
                        <p className="text-xs">Waiting for items...</p>
                    </div>
                ) : (
                    recentDetections.map((det, i) => (
                        <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/10">
                            <div className="flex items-center gap-3">
                                <div className={clsx(
                                    "w-1.5 h-8 rounded-full",
                                    det.class === "Wet Waste" ? "bg-cyan-500" :
                                        det.class === "Dry Waste" ? "bg-amber-500" :
                                            det.class === "Hazardous" ? "bg-rose-500" :
                                                "bg-emerald-500"
                                )} />
                                <div>
                                    <div className="text-sm font-bold text-slate-200">{det.class}</div>
                                    <div className="text-[10px] text-slate-500 font-mono">{det.time}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-bold text-teal-400">{(det.confidence * 100).toFixed(0)}%</div>
                                <div className="text-[9px] text-slate-500 uppercase tracking-widest">Conf</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
