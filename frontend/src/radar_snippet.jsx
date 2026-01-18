
// ===== PREMIUM RADAR CHART =====
export const PremiumRadarChart = ({ data, height = 300 }) => {
    return (
        <div className="w-full h-full chart-animate">
            <ResponsiveContainer width="100%" height={height}>
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                    <PolarGrid stroke="rgba(255, 255, 255, 0.1)" />
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                        name="Composition"
                        dataKey="A"
                        stroke="#2dd4bf"
                        strokeWidth={3}
                        fill="#2dd4bf"
                        fillOpacity={0.3}
                    />
                    <Tooltip content={<GlassTooltip />} />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
};
