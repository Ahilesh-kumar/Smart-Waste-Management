import React, { useState, useEffect } from 'react';
import { Activity, Wifi, Cpu, HardDrive, RefreshCw } from 'lucide-react';
import { AnimatedCounter, ProgressRing, Sparkline } from '../UIComponents';
import clsx from 'clsx';

export const SystemHealthWidget = ({ theme }) => {
    // Mock Stats - In real app, these would come from socket 'system_stats' event
    const [stats, setStats] = useState({
        fps: 24,
        latency: 45,
        cpu: 15,
        memory: 120,
        uptime: 0
    });

    // Simulate fluctuating stats
    useEffect(() => {
        const interval = setInterval(() => {
            setStats(prev => ({
                fps: Math.max(18, Math.min(30, prev.fps + (Math.random() - 0.5) * 4)),
                latency: Math.max(20, Math.min(100, prev.latency + (Math.random() - 0.5) * 10)),
                cpu: Math.max(5, Math.min(60, prev.cpu + (Math.random() - 0.5) * 5)),
                memory: prev.memory + (Math.random() * 0.1),
                uptime: prev.uptime + 1
            }));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const getHealthColor = (val, type) => {
        if (type === 'fps') return val < 20 ? 'red' : val < 24 ? 'amber' : 'emerald';
        if (type === 'latency') return val > 80 ? 'red' : val > 50 ? 'amber' : 'emerald';
        if (type === 'load') return val > 80 ? 'red' : val > 50 ? 'amber' : 'emerald';
        return 'teal';
    };

    return (
        <div className={clsx(
            "rounded-2xl p-6 border transition-all",
            theme === 'dark' ? "bg-black/40 border-white/10" : "bg-white/60 border-slate-200"
        )}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                        <Activity className="text-blue-500" size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold opacity-70">System Health</h3>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-mono opacity-50">ONLINE</span>
                        </div>
                    </div>
                </div>
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <RefreshCw size={14} className="opacity-50" />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Camera FPS */}
                <div className={clsx("p-3 rounded-xl border flex flex-col gap-1", theme === 'dark' ? "bg-white/5 border-white/5" : "bg-white border-slate-100")}>
                    <div className="flex justify-between text-xs opacity-60">
                        <span>Camera FPS</span>
                        <Wifi size={12} />
                    </div>
                    <div className={clsx("text-xl font-mono font-bold", `text-${getHealthColor(stats.fps, 'fps')}-500`)}>
                        {stats.fps.toFixed(1)}
                    </div>
                </div>

                {/* Latency */}
                <div className={clsx("p-3 rounded-xl border flex flex-col gap-1", theme === 'dark' ? "bg-white/5 border-white/5" : "bg-white border-slate-100")}>
                    <div className="flex justify-between text-xs opacity-60">
                        <span>Latency (ms)</span>
                        <Activity size={12} />
                    </div>
                    <div className={clsx("text-xl font-mono font-bold", `text-${getHealthColor(stats.latency, 'latency')}-500`)}>
                        {stats.latency.toFixed(0)}
                    </div>
                </div>

                {/* CPU Load */}
                <div className={clsx("p-3 rounded-xl border flex flex-col gap-1", theme === 'dark' ? "bg-white/5 border-white/5" : "bg-white border-slate-100")}>
                    <div className="flex justify-between text-xs opacity-60">
                        <span>Back-end CPU</span>
                        <Cpu size={12} />
                    </div>
                    <div className="flex items-end justify-between">
                        <div className={clsx("text-xl font-mono font-bold", `text-${getHealthColor(stats.cpu, 'load')}-500`)}>
                            {stats.cpu.toFixed(0)}%
                        </div>
                        <div className="h-1 w-12 bg-white/10 rounded-full overflow-hidden mb-1">
                            <div className="h-full bg-current transition-all duration-500" style={{ width: `${stats.cpu}%` }} />
                        </div>
                    </div>
                </div>

                {/* Memory */}
                <div className={clsx("p-3 rounded-xl border flex flex-col gap-1", theme === 'dark' ? "bg-white/5 border-white/5" : "bg-white border-slate-100")}>
                    <div className="flex justify-between text-xs opacity-60">
                        <span>Memory (MB)</span>
                        <HardDrive size={12} />
                    </div>
                    <div className="text-xl font-mono font-bold text-blue-400">
                        {stats.memory.toFixed(1)}
                    </div>
                </div>
            </div>
        </div>
    );
};
