
import React, { useState } from 'react';
import clsx from 'clsx';
import { TrendingUp, PieChart, BarChart2, Activity } from 'lucide-react';
import { ChartCard, EnhancedAreaChart, PremiumRadarChart, PremiumPieChart, ConfidenceHistogram, HourlyStackedBarChart, PredictiveLineChart, UsageHeatmap, SustainabilityGauge } from '../ChartEnhancements';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { GlassTooltip } from '../ChartEnhancements';

export const AnalyticsDeckWidget = ({
    theme,
    chartTimeRange = '5m',
    setChartTimeRange = () => { },
    timeSeriesData = [],
    processingCounts = { total: 0, recyclable: 0, hazardous: 0, wet: 0, dry: 0 },
    chartDataHistory = [],
    showComparisonMode = false,
    setShowComparisonMode = () => { },
    hourlyData = [],
    confidenceData = [],
    recentDetections = [],
    onExpandChart = () => { }
}) => {
    const [chartView, setChartView] = useState('pie'); // 'pie' or 'radar'

    // Pie chart data
    const pieData = [
        { name: 'Recyclable', value: processingCounts.recyclable || 0 },
        { name: 'Wet', value: processingCounts.wet || 0 },
        { name: 'Hazardous', value: processingCounts.hazardous || 0 },
        { name: 'Dry', value: processingCounts.dry || 0 }
    ];

    // Radar chart data
    const radarData = [
        { subject: 'Recyclable', A: processingCounts.recyclable || 0, fullMark: 100 },
        { subject: 'Wet', A: processingCounts.wet || 0, fullMark: 100 },
        { subject: 'Hazardous', A: processingCounts.hazardous || 0, fullMark: 100 },
        { subject: 'Dry', A: processingCounts.dry || 0, fullMark: 100 },
    ];

    // Comparison data
    const getComparisonData = () => [
        { name: 'Total', current: processingCounts.total, average: processingCounts.total * 0.8 },
        { name: 'Rec', current: processingCounts.recyclable, average: processingCounts.recyclable * 0.9 },
        { name: 'Wet', current: processingCounts.wet, average: processingCounts.wet * 0.7 }
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


    // Pro Charts Data Mock
    const predictiveData = [
        { time: '10:00', actual: 45, predicted: 45, threshold: 80 },
        { time: '11:00', actual: 52, predicted: 50, threshold: 80 },
        { time: '12:00', actual: 68, predicted: 65, threshold: 80 },
        { time: '13:00', actual: 75, predicted: 78, threshold: 80 },
        { time: '14:00', actual: null, predicted: 85, threshold: 80 },
        { time: '15:00', actual: null, predicted: 92, threshold: 80 },
    ];

    const heatmapData = [
        { hour: '08:00', value: 30 },
        { hour: '10:00', value: 65 },
        { hour: '12:00', value: 95 }, // Peak
        { hour: '14:00', value: 70 },
        { hour: '16:00', value: 45 },
        { hour: '18:00', value: 20 },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
            {/* 1. Waste Composition */}
            <ChartCard
                title="Waste Composition"
                icon={PieChart}
                description="Breakdown of detected waste by category (Recyclable, Wet, Hazardous, Dry)."
                onExpand={() => onExpandChart('composition')}
                className={clsx("card-modern", theme === 'dark' ? "card-modern-dark" : "card-modern-light", "p-4 flex flex-col group")}
                actions={
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

            {/* 2. Throughput Velocity */}
            <ChartCard
                title="Throughput Velocity"
                icon={TrendingUp}
                description="Real-time processing speed showing items detected per minute."
                onExpand={() => onExpandChart('throughput')}
                className={clsx("card-modern", theme === 'dark' ? "card-modern-dark" : "card-modern-light", "p-4 flex flex-col group")}
                actions={
                    <div className="flex items-center gap-2">
                        {/* Trend Delta Badge */}
                        {timeSeriesData.length >= 2 && (
                            <span className={clsx(
                                "px-1.5 py-0.5 text-[9px] font-bold rounded",
                                (timeSeriesData[timeSeriesData.length - 1]?.total || 0) >= (timeSeriesData[0]?.total || 0)
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-rose-500/20 text-rose-400"
                            )}>
                                {((timeSeriesData[timeSeriesData.length - 1]?.total || 0) >= (timeSeriesData[0]?.total || 0) ? "+" : "")}
                                {Math.round(((timeSeriesData[timeSeriesData.length - 1]?.total || 1) / Math.max(1, timeSeriesData[0]?.total || 1) - 1) * 100)}%
                            </span>
                        )}
                        {/* Time Range Buttons */}
                        <div className="flex gap-1">
                            {['5m', '1h', 'today', 'week'].map(r => (
                                <button
                                    key={r}
                                    onClick={() => setChartTimeRange(r)}
                                    className={clsx(
                                        "px-2 py-0.5 text-[10px] rounded capitalize",
                                        chartTimeRange === r ? "bg-cyan-500 text-white" : "text-slate-500 hover:text-slate-300"
                                    )}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>
                }
            >
                <EnhancedAreaChart
                    data={timeSeriesData}
                    height={180}
                    timeRange={chartTimeRange}
                />
            </ChartCard>

            {/* 3. Predictive Fill (PRO) */}
            <ChartCard
                title="Predictive Fill Level"
                icon={TrendingUp}
                description="Forecasts bin capacity saturation based on current inflow rates."
                onExpand={() => onExpandChart('predictive')}
                className={clsx("card-modern", theme === 'dark' ? "card-modern-dark" : "card-modern-light", "p-4 flex flex-col group")}
            >
                <PredictiveLineChart data={predictiveData} height={180} />
            </ChartCard>

            {/* 4. Peak Usage Heatmap (PRO) */}
            <ChartCard
                title="Peak Operational Hours"
                icon={Activity}
                description="Identifies busiest hours of operation to optimize staffing."
                onExpand={() => onExpandChart('heatmap')}
                className={clsx("card-modern", theme === 'dark' ? "card-modern-dark" : "card-modern-light", "p-4 flex flex-col group")}
            >
                <UsageHeatmap data={heatmapData} height={180} />
            </ChartCard>

            {/* 5. Sustainability Index (PRO) */}
            <ChartCard
                title="Sustainability Score"
                icon={PieChart}
                description="Real-time eco-efficiency score based on recycling accuracy."
                onExpand={() => onExpandChart('sustainability')}
                className={clsx("card-modern", theme === 'dark' ? "card-modern-dark" : "card-modern-light", "p-4 flex flex-col group")}
            >
                <SustainabilityGauge score={87} height={180} />
            </ChartCard>

            {/* 6. Confidence Distribution */}
            <ChartCard
                title="AI Confidence"
                icon={Activity}
                description="Histogram of AI detection certainty scores."
                onExpand={() => onExpandChart('confidence')}
                className={clsx("card-modern", theme === 'dark' ? "card-modern-dark" : "card-modern-light", "p-4 flex flex-col group")}
            >
                <ConfidenceHistogram data={computeConfidenceHistogram()} height={180} />
            </ChartCard>
        </div>
    );
};
