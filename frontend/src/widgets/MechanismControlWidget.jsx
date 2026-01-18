
import React from 'react';
import clsx from 'clsx';
import { Settings, Sliders } from 'lucide-react';

export const MechanismControlWidget = ({
    theme,
    speed = 'Medium',
    setSpeed = () => { },
    direction = 'Forward',
    toggleDirection = () => { },
    servos = [{ id: 0, angle: 0 }, { id: 1, angle: 0 }, { id: 2, angle: 0 }, { id: 3, angle: 0 }],
    setServo = () => { }
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            {/* Conveyor Controls */}
            <div className={clsx(
                "card-modern h-full flex flex-col transform transition-all hover:scale-[1.01]",
                theme === 'dark' ? "card-modern-dark" : "card-modern-light"
            )}>
                <h3 className="chart-title opacity-70 mb-4">
                    <Settings size={16} /> Conveyor Control
                </h3>
                <div className="space-y-4 flex-1 flex flex-col justify-center">
                    {/* Speed Segmented Control */}
                    <div className="segmented-control p-1 bg-white/5 rounded-xl flex">
                        {['Slow', 'Medium', 'Fast'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setSpeed(s)}
                                className={clsx(
                                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                                    speed === s ? "bg-cyan-500 text-black shadow-lg" : "text-white/50 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    {/* Direction Toggle */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => toggleDirection('Forward')}
                            className={clsx(
                                "flex-1 py-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all",
                                direction === 'Forward'
                                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                                    : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                            )}
                        >
                            → Forward
                        </button>
                        <button
                            onClick={() => toggleDirection('Backward')}
                            className={clsx(
                                "flex-1 py-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all",
                                direction !== 'Forward'
                                    ? "bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]"
                                    : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                            )}
                        >
                            ← Reverse
                        </button>
                    </div>
                </div>
            </div>

            {/* Servo Controls */}
            <div className={clsx(
                "card-modern h-full flex flex-col transform transition-all hover:scale-[1.01]",
                theme === 'dark' ? "card-modern-dark" : "card-modern-light"
            )}>
                <h3 className="chart-title opacity-70 mb-4">
                    <Sliders size={16} /> Servo Override
                </h3>
                <div className="grid grid-cols-4 gap-2 h-full">
                    {servos.map(servo => (
                        <div key={servo.id} className="flex flex-col items-center gap-2 h-full justify-end">
                            <div className="flex-1 w-full bg-black/20 dark:bg-white/5 rounded-xl relative overflow-hidden group hover:bg-white/10 transition-colors">
                                <div
                                    className="absolute bottom-0 w-full rounded-b-xl transition-all duration-300 bg-gradient-to-t from-indigo-600 to-violet-500"
                                    style={{ height: `${(servo.angle / 180) * 100}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="180"
                                value={servo.angle}
                                onChange={(e) => setServo(servo.id, parseInt(e.target.value))}
                                className="slider-modern w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                            />
                            <span className="text-[9px] font-mono opacity-60">S{servo.id}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
