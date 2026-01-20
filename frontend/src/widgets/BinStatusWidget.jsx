
import React from 'react';
import clsx from 'clsx';
import { Recycle, AlertTriangle, Activity, Trash2 } from 'lucide-react';
import { AnimatedCounter } from '../UIComponents';

export const BinStatusWidget = ({ theme, processingCounts = { total: 0, recyclable: 0, hazardous: 0, wet: 0, dry: 0 } }) => {
    return (
        <div className="grid grid-cols-2 grid-rows-2 gap-3 h-full">
            {/* Recyclable Card */}
            <div className={clsx(
                "category-card category-card-bio card-animate flex flex-col justify-center items-center p-2",
                theme === 'dark' ? "bg-neutral-900/60 border-white/10" : "bg-white/80 border border-slate-200"
            )}>
                <div className="category-icon category-icon-bio mb-1">
                    <Recycle size={16} className="text-white" />
                </div>
                <div className="stat-label text-emerald-400 text-[10px]">Recyclable</div>
                <AnimatedCounter value={processingCounts.recyclable} className="stat-number-sm text-emerald-500 text-xl" />
            </div>

            {/* Hazardous Card */}
            <div className={clsx(
                "category-card category-card-hazard card-animate flex flex-col justify-center items-center p-2",
                theme === 'dark' ? "bg-neutral-900/60 border-white/10" : "bg-white/80 border border-slate-200"
            )}>
                <div className="category-icon category-icon-hazard mb-1">
                    <AlertTriangle size={16} className="text-white" />
                </div>
                <div className="stat-label text-rose-400 text-[10px]">Hazardous</div>
                <AnimatedCounter value={processingCounts.hazardous} className="stat-number-sm text-rose-500 text-xl" />
            </div>

            {/* Wet Card */}
            <div className={clsx(
                "category-card category-card-wet card-animate flex flex-col justify-center items-center p-2",
                theme === 'dark' ? "bg-neutral-900/60 border-white/10" : "bg-white/80 border border-slate-200"
            )}>
                <div className="category-icon category-icon-wet mb-1">
                    <Activity size={16} className="text-white" />
                </div>
                <div className="stat-label text-cyan-400 text-[10px]">Wet Waste</div>
                <AnimatedCounter value={processingCounts.wet} className="stat-number-sm text-cyan-500 text-xl" />
            </div>

            {/* Dry Card */}
            <div className={clsx(
                "category-card category-card-dry card-animate flex flex-col justify-center items-center p-2",
                theme === 'dark' ? "bg-neutral-900/60 border-white/10" : "bg-white/80 border border-slate-200"
            )}>
                <div className="category-icon category-icon-dry mb-1">
                    <Trash2 size={16} className="text-white" />
                </div>
                <div className="stat-label text-amber-400 text-[10px]">Dry Waste</div>
                <AnimatedCounter value={processingCounts.dry} className="stat-number-sm text-amber-500 text-xl" />
            </div>
        </div>
    );
};
