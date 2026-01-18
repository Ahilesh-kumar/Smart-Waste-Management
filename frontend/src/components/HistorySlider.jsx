import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const HistorySlider = ({
    value,
    min,
    max,
    onChange,
    runs = [],
    className
}) => {
    // Calculate percentage for the fill width
    const percentage = ((value - min) / (max - min)) * 100;

    // Find current run label if available
    const currentRun = runs.find(r => r.id === value);

    return (
        <div className={clsx("flex flex-col gap-2 w-full", className)}>
            <div className="flex justify-between items-center text-xs text-emerald-400 font-mono mb-1">
                <span>HISTORY REPLAY</span>
                <span>{currentRun ? `RUN #${currentRun.id} • ${currentRun.timestamp}` : 'LIVE'}</span>
            </div>

            <div className="relative w-full h-8 flex items-center">
                {/* Track Background */}
                <div className="absolute w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
                    {/* Active Fill */}
                    <motion.div
                        className="h-full bg-gradient-to-r from-emerald-600 to-cyan-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                </div>

                {/* Custom Thumb (Pseudo-element implemented via standard input for accessibility, but visually hidden/overlaid) */}
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value))}
                    className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                />

                {/* Visual Thumb */}
                <motion.div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] border-2 border-emerald-500 pointer-events-none"
                    style={{ left: `calc(${percentage}% - 8px)` }}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.2 }}
                />

                {/* Ticks/Markers for Runs */}
                {runs.map((run) => {
                    const runPos = ((run.id - min) / (max - min)) * 100;
                    return (
                        <div
                            key={run.id}
                            className={clsx(
                                "absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full pointer-events-none transition-colors duration-300",
                                value >= run.id ? "bg-emerald-400/50" : "bg-slate-600"
                            )}
                            style={{ left: `${runPos}%` }}
                        />
                    );
                })}
            </div>

            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>PAST</span>
                <span>NOW</span>
            </div>
        </div>
    );
};

export default HistorySlider;
