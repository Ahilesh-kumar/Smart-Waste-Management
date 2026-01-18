
import React from 'react';
import clsx from 'clsx';
import { TrendingUp, PieChart, BarChart2 } from 'lucide-react';
import { ChartCard, EnhancedAreaChart, PremiumRadarChart, CompareChart } from '../ChartEnhancements';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { GlassTooltip } from '../ChartEnhancements';

export const AnalyticsDeckWidget = ({
    theme,
    chartTimeRange = '5m',
    setChartTimeRange = () => { },
    timeSeriesData = [],
    processingCounts = { total: 0, bio: 0, hazard: 0, wet: 0, dry: 0 },
    chartDataHistory = [],
    showComparisonMode = false,
    setShowComparisonMode = () => { },
    hourlyData = []
}) => {
    // Helper for dummy comparison data until real data is wired
    const getComparisonData = () => {
        // Simple mock: Current vs "Average" (80% of current)
        return [
            { name: 'Total', current: processingCounts.total, average: processingCounts.total * 0.8 },
            { name: 'Wet', current: processingCounts.wet, average: processingCounts.wet * 0.9 },
            { name: 'Dry', current: processingCounts.dry, average: processingCounts.dry * 0.7 }
        ];
    };

    // Helper for Radar Data
    const radarData = [
        { subject: 'Bio', A: processingCounts.bio, fullMark: 100 },
        { subject: 'Haz', A: processingCounts.hazard, fullMark: 100 },
        { subject: 'Wet', A: processingCounts.wet, fullMark: 100 },
        { subject: 'Dry', A: processingCounts.dry, fullMark: 100 },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            {/* Waste Composition - Radar */}
            <ChartCard
                title="Waste Composition"
                icon={PieChart}
                onExpand={() => { /* Handled in parent via prop if needed, or local state */ }}
            >
                <PremiumRadarChart data={radarData} height={180} />
            </ChartCard>

            {/* Throughput Velocity - Area */}
            <ChartCard
                title="Throughput Velocity"
                icon={TrendingUp}
                rightElement={
                    <div className="flex gap-1">
                        {['5m', '1h'].map(r => (
                            <button
                                key={r}
                                onClick={() => setChartTimeRange(r)}
                                className={clsx(
                                    "px-2 py-0.5 text-[10px] rounded",
                                    chartTimeRange === r ? "bg-cyan-500 text-white" : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                }
            >
                <EnhancedAreaChart
                    data={timeSeriesData}
                    height={180}
                    timeRange={chartTimeRange}
                />
            </ChartCard>

            {/* Historical Comparison - Stacked Bar */}
            <ChartCard
                title="Session vs Average"
                icon={BarChart2}
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
