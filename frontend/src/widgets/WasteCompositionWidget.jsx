import React from 'react';
import clsx from 'clsx';
import { PieChart } from 'lucide-react';
import { ChartCard, PremiumRadarChart } from '../ChartEnhancements';

export const WasteCompositionWidget = ({
    theme,
    processingCounts = { total: 0, bio: 0, hazard: 0, wet: 0, dry: 0 }
}) => {
    const radarData = [
        { subject: 'Recyclable', A: processingCounts.recyclable, fullMark: 100 },
        { subject: 'Wet', A: processingCounts.wet, fullMark: 100 },
        { subject: 'Hazardous', A: processingCounts.hazardous, fullMark: 100 },
        { subject: 'Dry', A: processingCounts.dry, fullMark: 100 },
    ];

    return (
        <div className="h-full">
            <ChartCard
                title="Waste Composition"
                icon={PieChart}
                className="h-full"
            >
                <PremiumRadarChart data={radarData} height={180} />
            </ChartCard>
        </div>
    );
};
