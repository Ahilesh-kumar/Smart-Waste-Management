import React, { useMemo } from 'react';
import clsx from 'clsx';
import { TrendingUp, Gauge } from 'lucide-react';
import { ChartCard } from '../ChartEnhancements';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';

// Custom tooltip
const SpeedTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="px-3 py-2 rounded-lg bg-slate-900/90 border border-white/10 backdrop-blur-sm">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-lg font-bold text-cyan-400">{payload[0].value} items/min</p>
            </div>
        );
    }
    return null;
};

export const ThroughputVelocityWidget = ({
    chartTimeRange = '5m',
    setChartTimeRange = () => { },
    timeSeriesData = []
}) => {
    // Calculate processing speed (items per minute) from time series data
    const speedData = useMemo(() => {
        if (timeSeriesData.length < 2) return [];

        // Calculate moving average speed (total items in last N minutes)
        return timeSeriesData.map((point, idx) => {
            // Look back at last few points to calculate rate
            const lookback = Math.min(idx + 1, 3);
            let totalItems = 0;
            for (let i = idx - lookback + 1; i <= idx; i++) {
                if (i >= 0) {
                    totalItems += (timeSeriesData[i].total || 0);
                }
            }
            // Assume each point is ~10 seconds apart, so multiply to get items/min
            const itemsPerMin = Math.round((totalItems / lookback) * 6);

            return {
                time: point.time,
                speed: itemsPerMin
            };
        });
    }, [timeSeriesData]);

    // Calculate current speed and average
    const currentSpeed = speedData.length > 0 ? speedData[speedData.length - 1].speed : 0;
    const avgSpeed = speedData.length > 0
        ? Math.round(speedData.reduce((sum, p) => sum + p.speed, 0) / speedData.length)
        : 0;

    return (
        <div className="h-full">
            <ChartCard
                title="Throughput Velocity"
                icon={Gauge}
                className="h-full"
                rightElement={
                    <div className="flex items-center gap-3">
                        {/* Current Speed Badge */}
                        <div className={clsx(
                            "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold",
                            currentSpeed > avgSpeed
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-amber-500/20 text-amber-400"
                        )}>
                            <TrendingUp size={12} />
                            {currentSpeed} items/min
                        </div>

                        {/* Time Range Buttons */}
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
                    </div>
                }
            >
                {speedData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={speedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="speedLine" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.6} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="time"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 10 }}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 10 }}
                                domain={[0, 'auto']}
                            />
                            <Tooltip content={<SpeedTooltip />} />
                            <ReferenceLine
                                y={avgSpeed}
                                stroke="#94a3b8"
                                strokeDasharray="3 3"
                                label={{ value: 'Avg', fill: '#94a3b8', fontSize: 10 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="speed"
                                stroke="url(#speedLine)"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, fill: '#06b6d4' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
                        Waiting for data...
                    </div>
                )}
            </ChartCard>
        </div>
    );
};
