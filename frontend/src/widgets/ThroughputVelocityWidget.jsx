import React from 'react';
import clsx from 'clsx';
import { TrendingUp } from 'lucide-react';
import { ChartCard, EnhancedAreaChart } from '../ChartEnhancements';

export const ThroughputVelocityWidget = ({
    theme,
    chartTimeRange = '5m',
    setChartTimeRange = () => { },
    timeSeriesData = []
}) => {
    return (
        <div className="h-full">
            <ChartCard
                title="Throughput Velocity"
                icon={TrendingUp}
                className="h-full"
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
        </div>
    );
};
