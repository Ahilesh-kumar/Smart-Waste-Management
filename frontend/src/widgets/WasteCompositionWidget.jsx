import React from 'react';
import clsx from 'clsx';
import { PieChart } from 'lucide-react';
import { ChartCard, PremiumRadarChart } from '../ChartEnhancements';

export const WasteCompositionWidget = ({
    theme,
    processingCounts = { total: 0, bio: 0, hazard: 0, wet: 0, dry: 0 }
}) => {
    const radarData = [
        { subject: 'Bio', A: processingCounts.bio, fullMark: 100 },
        { subject: 'Haz', A: processingCounts.hazard, fullMark: 100 },
        { subject: 'Wet', A: processingCounts.wet, fullMark: 100 },
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
