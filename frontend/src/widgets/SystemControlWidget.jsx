
import React from 'react';
import clsx from 'clsx';
import { Power, Pause, Play, Clock } from 'lucide-react';
import { TiltCard } from '../UIComponents';

export const SystemControlWidget = ({
    theme,
    isOn = false,
    isPaused = false,
    sessionDuration = '00:00:00',
    togglePower = () => { },
    togglePause = () => { }
}) => {
    return (
        <TiltCard className={clsx(
            "h-full p-6 card-modern-dark transition-all border-white/5 flex flex-col justify-between"
        )}>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="font-display text-xl font-bold">System Control</h2>
                    <p className="stat-label mt-1">Master Switch</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={togglePause}
                        className={clsx(
                            "w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95",
                            isPaused ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30" : "bg-neutral-800 hover:bg-neutral-700"
                        )}
                        title={isPaused ? "Resume" : "Pause"}
                    >
                        {isPaused ? <Play size={24} className="text-white fill-current" /> : <Pause size={24} className="text-white" />}
                    </button>
                    <button
                        onClick={togglePower}
                        className={clsx(
                            "w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95",
                            isOn ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/30" : "bg-teal-500 hover:bg-teal-600 shadow-teal-500/30"
                        )}
                    >
                        <Power size={24} className="text-white" />
                    </button>
                </div>
            </div>

            <div className={clsx(
                "rounded-xl p-4 flex items-center justify-between",
                theme === 'dark' ? "bg-white/5" : "bg-slate-100"
            )}>
                <div className="flex items-center gap-3">
                    <Clock size={18} className={isPaused ? "text-amber-400" : "text-teal-400"} />
                    <div>
                        <div className="stat-label">Session Time</div>
                        <div className={clsx("stat-number-sm text-lg", isPaused && "text-amber-400")}>
                            {isPaused ? "PAUSED" : sessionDuration}
                        </div>
                    </div>
                </div>
            </div>
        </TiltCard>
    );
};
