import React from 'react';
import clsx from 'clsx';
import { BarChart2 } from 'lucide-react';
import { ChartCard, GlassTooltip } from '../ChartEnhancements';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const SessionCompareWidget = ({
    theme,
    processingCounts = { total: 0, recyclable: 0, hazardous: 0, wet: 0, dry: 0 },
    showComparisonMode = false,
    setShowComparisonMode = () => { }
}) => {
    const getComparisonData = () => {
        return [
            { name: 'Total', current: processingCounts.total, average: processingCounts.total * 0.8 },
            { name: 'Wet', current: processingCounts.wet, average: processingCounts.wet * 0.9 },
            { name: 'Dry', current: processingCounts.dry, average: processingCounts.dry * 0.7 }
        ];
    };

    return (
        <div className="h-full">
            <ChartCard
                title="Session vs Average"
                icon={BarChart2}
                className="h-full"
                rightElement={
                    <button
                        onClick={() => setShowComparisonMode(!showComparisonMode)}
                        className="text-[10px] text-cyan-400 hover:underline"
                    >
                        {showComparisonMode ? "Show Hourly" : "Compare"}
                    </button>
                }
            >
                <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={getComparisonData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                        <Tooltip content={<GlassTooltip />} />
                        <Bar dataKey="current" name="This Session" fill="#2dd4bf" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="average" name="Daily Avg" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={20} fillOpacity={0.3} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>
        </div>
    );
};
