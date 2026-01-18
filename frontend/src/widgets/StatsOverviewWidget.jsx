
import React from 'react';
import clsx from 'clsx';
import { Database, Leaf, TrendingUp } from 'lucide-react';
import { TiltCard, AnimatedCounter } from '../UIComponents';

export const StatsOverviewWidget = ({
    theme,
    processingCounts = { total: 0, bio: 0, hazard: 0, wet: 0, dry: 0 },
    ecoMetrics = { co2Offset: 0, treesEquivalent: 0, energySaved: 0 },
    onHistoryClick
}) => {
    return (
        <div className="grid grid-cols-2 gap-4 h-full relative">
            {/* Total Items Card */}
            <TiltCard
                className={clsx(
                    "cursor-pointer hover-lift p-4 flex flex-col justify-between",
                    theme === 'dark' ? "card-modern-dark" : "card-modern-light"
                )}
            >
                <div onClick={onHistoryClick} className="h-full flex flex-col justify-between">
                    <div className="stat-label flex items-center justify-between">
                        Total <Database size={12} className="opacity-50" />
                    </div>
                    <AnimatedCounter value={processingCounts.total} className="stat-number gradient-text-primary text-3xl" />
                </div>
            </TiltCard>

            {/* Environmental Impact Widget */}
            <TiltCard className={clsx(
                "p-4 flex flex-col justify-between",
                theme === 'dark' ? "bg-emerald-950/20 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"
            )}>
                <div className="flex justify-between items-start">
                    <div className="stat-label text-emerald-600 dark:text-emerald-400">Impact</div>
                    <Leaf size={14} className="text-emerald-500" />
                </div>
                <div>
                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                        {ecoMetrics.treesEquivalent} <span className="text-[10px] font-normal opacity-70">trees</span>
                    </div>
                    <div className="text-[10px] opacity-60 mt-0.5">
                        {ecoMetrics.co2Offset} kg CO2 saved
                    </div>
                </div>
            </TiltCard>

            {/* Revenue Card (Full Width at bottom if needed, or 3rd item?) 
                For now we keep the 2-grid structure from App.jsx but maybe Revenue was a separate card.
                In grid layout, we might want Revenue as a separate widget or part of this.
                Let's include Revenue as a 3rd item if it fits, or assume this widget is 2x2.
                Actually, let's keep it simple: This widget returns a Fragment or a div with grid.
            */}
            <div className="col-span-2 card-modern card-modern-dark glow-primary p-4 flex flex-col justify-between relative overflow-hidden">
                <div className="stat-label opacity-70">Revenue Generated</div>
                <div className="stat-number text-teal-400 text-2xl">${(processingCounts.total * 0.05).toFixed(2)}</div>
                <TrendingUp className="absolute bottom-[-10px] right-[-10px] text-white/5" size={64} />
            </div>
        </div>
    );
};
