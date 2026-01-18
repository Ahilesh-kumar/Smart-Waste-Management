
import React, { useState } from 'react';
import clsx from 'clsx';
import { TrendingUp, PieChart, BarChart2, Activity } from 'lucide-react';
import { ChartCard, EnhancedAreaChart, PremiumRadarChart, PremiumPieChart, ConfidenceHistogram, HourlyStackedBarChart } from '../ChartEnhancements';
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
    hourlyData = [],
    confidenceData = [],
    recentDetections = []
}) => {
    const [chartView, setChartView] = useState('pie'); // 'pie' or 'radar'

    // Pie chart data
    const pieData = [
        { name: 'Bio', value: processingCounts.bio || 0 },
        { name: 'Hazard', value: processingCounts.hazard || 0 },
        { name: 'Wet', value: processingCounts.wet || 0 },
        { name: 'Dry', value: processingCounts.dry || 0 }
    ];

    // Radar chart data
    const radarData = [
        { subject: 'Bio', A: processingCounts.bio || 0, fullMark: 100 },
        { subject: 'Hazard', A: processingCounts.hazard || 0, fullMark: 100 },
        { subject: 'Wet', A: processingCounts.wet || 0, fullMark: 100 },
        { subject: 'Dry', A: processingCounts.dry || 0, fullMark: 100 },
    ];

    // Comparison data
    const getComparisonData = () => [
        { name: 'Total', current: processingCounts.total, average: processingCounts.total * 0.8 },
        { name: 'Wet', current: processingCounts.wet, average: processingCounts.wet * 0.9 },
        { name: 'Dry', current: processingCounts.dry, average: processingCounts.dry * 0.7 }
    ];

    // Compute confidence histogram from recent detections
    const computeConfidenceHistogram = () => {
        if (confidenceData && confidenceData.length > 0) return confidenceData;

        const bins = [
            { range: '0-20%', count: 0 },
            { range: '20-40%', count: 0 },
            { range: '40-60%', count: 0 },
            { range: '60-80%', count: 0 },
            { range: '80-100%', count: 0 }
        ];

        if (recentDetections && recentDetections.length > 0) {
            recentDetections.forEach(d => {
                const conf = (d.confidence || 0) * 100;
                if (conf < 20) bins[0].count++;
                else if (conf < 40) bins[1].count++;
                else if (conf < 60) bins[2].count++;
                else if (conf < 80) bins[3].count++;
                else bins[4].count++;
            });
        }
        return bins;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
            {/* 1. Waste Composition - Pie/Radar Toggle */}
            <ChartCard
                title="Waste Composition"
                icon={PieChart}
                rightElement={
                    <div className="flex gap-1">
                        <button
                            onClick={() => setChartView('pie')}
                            className={clsx(
                                "px-2 py-0.5 text-[10px] rounded",
                                chartView === 'pie' ? "bg-emerald-500 text-white" : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            Pie
                        </button>
                        <button
                            onClick={() => setChartView('radar')}
                            className={clsx(
                                "px-2 py-0.5 text-[10px] rounded",
                                chartView === 'radar' ? "bg-cyan-500 text-white" : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            Radar
                        </button>
                    </div>
                }
            >
                {chartView === 'pie' ? (
                    <PremiumPieChart data={pieData} height={180} showLegend={false} />
                ) : (
                    <PremiumRadarChart data={radarData} height={180} />
                )}
            </ChartCard>

            {/* 2. Throughput Velocity - Area Chart */}
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

            {/* 3. Session vs Average - Bar Chart */}
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

            {/* 4. Hourly Breakdown - Stacked Bar Chart */}
            <ChartCard
                title="Hourly Breakdown"
                icon={BarChart2}
            >
                <HourlyStackedBarChart data={hourlyData} height={180} />
            </ChartCard>

            {/* 5. Detection Confidence - Histogram */}
            <ChartCard
                title="Confidence Distribution"
                icon={Activity}
            >
                <ConfidenceHistogram data={computeConfidenceHistogram()} height={180} />
            </ChartCard>

            {/* 6. Material Distribution - Radar (Always visible as secondary view) */}
            <ChartCard
                title="Material Balance"
                icon={PieChart}
            >
                <PremiumRadarChart data={radarData} height={180} />
            </ChartCard>
        </div>
    );
};
