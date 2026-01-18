import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AreaChart, Area, LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    PieChart, Pie, Cell, Sector
} from 'recharts';
import { X, Maximize2, ArrowLeftRight, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

// ===== CATEGORY COLORS =====
const CATEGORY_COLORS = {
    bio: { main: '#10b981', gradient: 'url(#gradientBio)' },
    hazard: { main: '#f43f5e', gradient: 'url(#gradientHazard)' },
    wet: { main: '#06b6d4', gradient: 'url(#gradientWet)' },
    dry: { main: '#f59e0b', gradient: 'url(#gradientDry)' }
};

// ===== MODERN GLASSMORPHISM TOOLTIP =====
export const GlassTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="px-4 py-3 rounded-xl backdrop-blur-xl bg-neutral-900/90 border border-white/10 shadow-2xl shadow-black/50"
        >
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{label}</div>
            <div className="space-y-1.5">
                {payload.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-2.5 h-2.5 rounded-full shadow-lg"
                                style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}40` }}
                            />
                            <span className="text-xs text-slate-300 capitalize">{item.name}</span>
                        </div>
                        <span className="text-sm text-white font-bold font-mono">
                            {typeof item.value === 'number' ? item.value.toFixed(1) : item.value}
                        </span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

// ===== TIME RANGE SELECTOR =====
export const TimeRangeSelector = ({ value, onChange }) => {
    const options = ['5m', '15m', '1h', 'all'];

    return (
        <div className="flex gap-1 p-1 rounded-lg bg-neutral-900/50 border border-white/10">
            {options.map(opt => (
                <button
                    key={opt}
                    onClick={() => onChange(opt)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${value === opt
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/30'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                        }`}
                >
                    {opt.toUpperCase()}
                </button>
            ))}
        </div>
    );
};

// ===== GRADIENT AREA CHART (Enhanced) =====
export const EnhancedAreaChart = ({
    data = [],
    categories = ['bio', 'hazard', 'wet', 'dry'],
    height = 200,
    timeRange = 'all',
    showLegend = true
}) => {
    // Filter data based on time range
    const filteredData = useMemo(() => {
        if (timeRange === 'all' || !data.length) return data;
        // Map time ranges to number of data points to show
        const sliceMap = {
            '5m': 5,      // ~50 seconds at 10s intervals
            '15m': 15,    // ~2.5 minutes
            '1h': 30,     // ~5 minutes
            'today': 100, // Last 100 points (~16 minutes)
            'week': data.length // Show all available (max 500)
        };
        return data.slice(-(sliceMap[timeRange] || data.length));
    }, [data, timeRange]);

    return (
        <div className="w-full chart-animate">
            <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={0}>
                <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    {/* Gradient Definitions */}
                    <defs>
                        <linearGradient id="gradientBio" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="gradientHazard" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.5} />
                            <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="gradientWet" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.5} />
                            <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="gradientDry" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} />
                            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                        </linearGradient>
                        {/* Glow filter */}
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis
                        dataKey="time"
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                        tickLine={false}
                    />
                    <Tooltip content={<GlassTooltip />} />
                    {showLegend && (
                        <Legend
                            wrapperStyle={{ paddingTop: '10px' }}
                            iconType="circle"
                            iconSize={8}
                        />
                    )}

                    {categories.map(cat => (
                        <Area
                            key={cat}
                            type="monotone"
                            dataKey={cat}
                            name={cat.charAt(0).toUpperCase() + cat.slice(1)}
                            stroke={CATEGORY_COLORS[cat].main}
                            strokeWidth={2}
                            fill={CATEGORY_COLORS[cat].gradient}
                            filter="url(#glow)"
                            animationDuration={1200}
                            animationEasing="ease-out"
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

// ===== EXPANDABLE CHART MODAL =====
export const ChartModal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-8"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25 }}
                    className="w-full max-w-5xl max-h-[90vh] bg-neutral-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                        <h2 className="text-lg font-bold text-white">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
                        >
                            <X size={20} className="text-slate-400" />
                        </button>
                    </div>

                    {/* Modal Content */}
                    <div className="p-6 overflow-auto max-h-[calc(90vh-80px)]">
                        {children}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// ===== COMPARE MODE TOGGLE =====
export const CompareToggle = ({ isActive, onToggle }) => (
    <button
        onClick={onToggle}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${isActive
            ? 'bg-violet-500/20 text-violet-400 border border-violet-500/50'
            : 'bg-neutral-900/50 text-neutral-400 border border-white/10 hover:border-white/20'
            }`}
    >
        <ArrowLeftRight size={14} />
        Compare
    </button>
);

// ===== CHART CARD WITH EXPAND BUTTON =====
export const ChartCard = ({
    title,
    icon: Icon,
    children,
    onExpand,
    actions,
    className = '',
    description
}) => (
    <div className={`chart-card group ${className}`}>
        <div className="flex items-center justify-between mb-4">
            <h3 className="chart-title group/title flex items-center gap-2 cursor-help relative">
                {Icon && <Icon size={14} className="text-slate-500" />}
                <span>{title}</span>
                {description && (
                    <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-slate-900 border border-white/10 rounded-lg text-[10px] text-slate-300 opacity-0 group-hover/title:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl">
                        {description}
                    </div>
                )}
            </h3>
            <div className="flex items-center gap-2">
                {actions}
                {onExpand && (
                    <button
                        onClick={onExpand}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 hover:border-cyan-500/50 transition-all opacity-60 group-hover:opacity-100"
                        title="Expand chart"
                    >
                        <Maximize2 size={14} className="text-slate-400 group-hover:text-cyan-400" />
                    </button>
                )}
            </div>
        </div>
        {children}
    </div>
);

// ===== COMPARE CHART (Overlay two periods) =====
export const CompareChart = ({
    currentData = [],
    previousData = [],
    height = 200
}) => {
    return (
        <div className="w-full">
            <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={0}>
                <AreaChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="currentGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="prevGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#a855f7" stopOpacity={0.02} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} />
                    <Tooltip content={<GlassTooltip />} />
                    <Legend />

                    {/* Previous period (dashed) */}
                    <Area
                        data={previousData}
                        type="monotone"
                        dataKey="total"
                        name="Previous"
                        stroke="#a855f7"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        fill="url(#prevGrad)"
                    />

                    {/* Current period (solid) */}
                    <Area
                        data={currentData}
                        type="monotone"
                        dataKey="total"
                        name="Current"
                        stroke="#14b8a6"
                        strokeWidth={2}
                        fill="url(#currentGrad)"
                    />
                </AreaChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex justify-center gap-6 mt-3 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-teal-500" />
                    <span className="text-slate-400">Current</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-violet-500 border-dashed" style={{ borderBottom: '2px dashed #a855f7', height: 0 }} />
                    <span className="text-slate-400">Previous</span>
                </div>
            </div>
        </div>
    );
};

// ===== REACTIVE LIQUID ORB BACKGROUND =====
// A large, fluid, glowing orb that follows the mouse lazily


export const AnimatedBackground = () => {
    const orbRef = useRef(null);

    useEffect(() => {
        const orb = orbRef.current;
        if (!orb) return;

        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let orbX = mouseX;
        let orbY = mouseY;

        // Configuration
        const speed = 0.05; // Lower = lazier/smoother follow

        const handleMouseMove = (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        };

        window.addEventListener('mousemove', handleMouseMove);

        let animationFrameId;

        const animate = () => {
            // Linear interpolation for smooth trailing
            orbX += (mouseX - orbX) * speed;
            orbY += (mouseY - orbY) * speed;

            // Apply position
            orb.style.transform = `translate(${orbX}px, ${orbY}px) translate(-50%, -50%)`;

            animationFrameId = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            {/* The Liquid Orb */}
            <div
                ref={orbRef}
                className="absolute w-[800px] h-[800px] rounded-full blur-[120px] opacity-20"
                style={{
                    background: 'conic-gradient(from 0deg, #06b6d4, #8b5cf6, #ec4899, #06b6d4)',
                    top: 0,
                    left: 0,
                    willChange: 'transform'
                }}
            >
                {/* Inner animating texture/morph using CSS animation */}
                <div className="absolute inset-0 animate-spin-slow rounded-full mix-blend-overlay opacity-50"
                    style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2), transparent)' }} />
            </div>

            {/* Ambient secondary static glow for depth */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-10"
                style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)' }} />

            {/* Very subtle mesh overlay to texture the black */}
            <div className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />
        </div>
    );
};

// ===== TIMELINE SCRUBBER =====
// Beautiful timeline with draggable slider and animated background
export const TimelineScrubber = ({
    value = 0,  // 0 = live, negative = past snapshots
    onChange,
    maxHistory = 30,
    snapshots = [],
    label = "Timeline"
}) => {
    const isLive = value === 0;
    const availableSnapshots = Math.min(snapshots.length, maxHistory);
    const minValue = availableSnapshots > 0 ? -(availableSnapshots - 1) : 0;

    // Format timestamp from snapshot
    const getTimestamp = (idx) => {
        if (idx === 0) return 'LIVE';
        const snapshotIdx = snapshots.length + idx;
        if (snapshotIdx >= 0 && snapshots[snapshotIdx]?.timestamp) {
            const date = new Date(snapshots[snapshotIdx].timestamp);
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
        return `${Math.abs(idx) * 5}s ago`;
    };

    const handleSliderChange = (e) => {
        const newValue = parseInt(e.target.value);
        onChange(newValue);
    };

    return (
        <div className="relative w-full mt-4 mb-2 p-6 rounded-2xl card-modern-dark overflow-visible">
            {/* Content */}
            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between text-sm mb-6 pr-2">
                    <span className="flex items-center gap-2 text-slate-300">
                        <Clock size={16} className="text-cyan-400" />
                        <span className="font-semibold tracking-wide">{label}</span>
                    </span>
                    <span className={`font-bold text-base flex items-center gap-2 pr-2 ${isLive ? 'text-teal-400' : 'text-cyan-400'}`}>
                        {isLive ? (
                            <>
                                <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse shadow-[0_0_10px_rgba(45,212,191,0.6)]" />
                                LIVE
                            </>
                        ) : (
                            <span className="bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full text-sm shadow-lg shadow-cyan-900/20">{getTimestamp(value)}</span>
                        )}
                    </span>
                </div>

                {/* Slider Container */}
                <div className="flex items-center gap-5">
                    {/* Left Arrow */}
                    <button
                        onClick={() => onChange(Math.max(minValue, value - 1))}
                        disabled={value <= minValue || availableSnapshots === 0}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] disabled:opacity-30 disabled:cursor-not-allowed transition-all group"
                    >
                        <ChevronLeft size={20} className="text-slate-400 group-hover:text-cyan-300 transition-colors" />
                    </button>

                    {/* Slider Track */}
                    <div className="flex-1 relative py-4 px-1">
                        {/* Track Background - Darker Glass Trench */}
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-black/40 border border-white/5 shadow-inner" />

                        {/* Progress Fill - Neon Liquid */}
                        <div
                            className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-teal-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                            style={{
                                left: 0,
                                width: availableSnapshots > 0 ? `${((value - minValue) / (0 - minValue)) * 100}%` : '100%'
                            }}
                        />

                        {/* Range Input */}
                        <input
                            type="range"
                            min={minValue}
                            max={0}
                            value={value}
                            onChange={handleSliderChange}
                            disabled={availableSnapshots === 0}
                            className="relative z-10 w-full h-8 appearance-none bg-transparent cursor-pointer disabled:cursor-not-allowed
                                [&::-webkit-slider-thumb]:appearance-none
                                [&::-webkit-slider-thumb]:w-6
                                [&::-webkit-slider-thumb]:h-6
                                [&::-webkit-slider-thumb]:rounded-full
                                [&::-webkit-slider-thumb]:bg-white
                                [&::-webkit-slider-thumb]:bg-gradient-to-b
                                [&::-webkit-slider-thumb]:from-white
                                [&::-webkit-slider-thumb]:to-slate-300
                                [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(255,255,255,0.4)]
                                [&::-webkit-slider-thumb]:border-4
                                [&::-webkit-slider-thumb]:border-cyan-500
                                [&::-webkit-slider-thumb]:cursor-grab
                                [&::-webkit-slider-thumb]:active:cursor-grabbing
                                [&::-webkit-slider-thumb]:transition-all
                                [&::-webkit-slider-thumb]:hover:scale-110
                                [&::-webkit-slider-thumb]:hover:shadow-[0_0_20px_rgba(6,182,212,0.6)]
                                [&::-moz-range-thumb]:w-6
                                [&::-moz-range-thumb]:h-6
                                [&::-moz-range-thumb]:border-4
                                [&::-moz-range-thumb]:border-cyan-500"
                        />
                    </div>

                    {/* Right Arrow */}
                    <button
                        onClick={() => onChange(Math.min(0, value + 1))}
                        disabled={value >= 0}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] disabled:opacity-30 disabled:cursor-not-allowed transition-all group"
                    >
                        <ChevronRight size={20} className="text-slate-400 group-hover:text-cyan-300 transition-colors" />
                    </button>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center text-xs text-slate-500 mt-5 px-1 pr-2">
                    <span className="flex items-center gap-1.5 font-medium tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                        Past
                    </span>
                    <span className="px-3 py-1 rounded-full bg-black/40 text-slate-400 border border-white/5 font-mono text-[10px] uppercase tracking-wider">
                        {availableSnapshots > 0 ? `${availableSnapshots} SNAPSHOTS` : 'WAITING FOR DATA...'}
                    </span>
                    <span className="flex items-center gap-1.5 font-medium tracking-wide text-cyan-200/70">
                        Now
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                    </span>
                </div>
            </div>
        </div>
    );
};

// Keep HistorySlider for backward compatibility but deprecated
export const HistorySlider = TimelineScrubber;

// ===== PREMIUM RADAR CHART =====
export const PremiumRadarChart = ({ data, height = 300 }) => {
    return (
        <div className="w-full h-full chart-animate">
            <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={0}>
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

// ===== PIE CHART CATEGORY COLORS =====
const PIE_COLORS = ['#10b981', '#f43f5e', '#06b6d4', '#f59e0b', '#8b5cf6', '#ec4899'];

// ===== ACTIVE SHAPE FOR PIE CHART =====
const renderActiveShape = (props) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
        <g>
            <text x={cx} y={cy} dy={8} textAnchor="middle" fill="#fff" className="text-lg font-bold">
                {payload.name}
            </text>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
            />
            <Sector
                cx={cx}
                cy={cy}
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={outerRadius + 6}
                outerRadius={outerRadius + 10}
                fill={fill}
            />
            <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
            <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
            <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#e2e8f0" className="text-xs">
                {`${value} items`}
            </text>
            <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#94a3b8" className="text-[10px]">
                {`(${(percent * 100).toFixed(1)}%)`}
            </text>
        </g>
    );
};

// ===== PREMIUM PIE CHART =====
export const PremiumPieChart = ({ data = [], height = 200, showLegend = true }) => {
    const [activeIndex, setActiveIndex] = useState(0);

    const onPieEnter = (_, index) => {
        setActiveIndex(index);
    };

    // Transform data if needed (handle different data shapes)
    const chartData = useMemo(() => {
        if (!data || data.length === 0) {
            return [
                { name: 'Bio', value: 0 },
                { name: 'Hazard', value: 0 },
                { name: 'Wet', value: 0 },
                { name: 'Dry', value: 0 }
            ];
        }
        return data;
    }, [data]);

    return (
        <div className="w-full h-full chart-animate">
            <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={0}>
                <PieChart>
                    <defs>
                        {PIE_COLORS.map((color, index) => (
                            <linearGradient key={`gradient-${index}`} id={`pieGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color} stopOpacity={1} />
                                <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                            </linearGradient>
                        ))}
                    </defs>
                    <Pie
                        activeIndex={activeIndex}
                        activeShape={renderActiveShape}
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={height * 0.25}
                        outerRadius={height * 0.38}
                        paddingAngle={3}
                        dataKey="value"
                        onMouseEnter={onPieEnter}
                        animationBegin={0}
                        animationDuration={800}
                        animationEasing="ease-out"
                    >
                        {chartData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={`url(#pieGradient${index % PIE_COLORS.length})`}
                                stroke="rgba(0,0,0,0.3)"
                                strokeWidth={2}
                            />
                        ))}
                    </Pie>
                    {showLegend && (
                        <Legend
                            layout="horizontal"
                            verticalAlign="bottom"
                            align="center"
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ paddingTop: '10px' }}
                            formatter={(value) => <span className="text-xs text-slate-400">{value}</span>}
                        />
                    )}
                    <Tooltip content={<GlassTooltip />} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

// ===== CONFIDENCE HISTOGRAM =====
export const ConfidenceHistogram = ({ data = [], height = 150 }) => {
    // data should be array of { range: '0-20%', count: 5 } or similar
    const chartData = useMemo(() => {
        if (!data || data.length === 0) {
            // Generate default bins
            return [
                { range: '0-20%', count: 0 },
                { range: '20-40%', count: 0 },
                { range: '40-60%', count: 0 },
                { range: '60-80%', count: 0 },
                { range: '80-100%', count: 0 }
            ];
        }
        return data;
    }, [data]);

    return (
        <div className="w-full chart-animate">
            <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={0}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                        <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.4} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                        dataKey="range"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 9 }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                    />
                    <Tooltip content={<GlassTooltip />} />
                    <Bar
                        dataKey="count"
                        name="Detections"
                        fill="url(#confidenceGradient)"
                        radius={[4, 4, 0, 0]}
                        barSize={24}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

// ===== HOURLY STACKED BAR CHART =====
export const HourlyStackedBarChart = ({ data = [], height = 180 }) => {
    const chartData = useMemo(() => {
        if (!data || data.length === 0) {
            // Default empty hours
            return Array.from({ length: 12 }, (_, i) => ({
                hour: `${i + 8}:00`,
                bio: 0, hazard: 0, wet: 0, dry: 0
            }));
        }
        return data;
    }, [data]);

    return (
        <div className="w-full chart-animate">
            <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={0}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                        dataKey="hour"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 9 }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                    />
                    <Tooltip content={<GlassTooltip />} />
                    <Legend
                        iconType="circle"
                        iconSize={6}
                        wrapperStyle={{ paddingTop: '5px' }}
                    />
                    <Bar dataKey="bio" name="Bio" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="hazard" name="Hazard" stackId="a" fill="#f43f5e" />
                    <Bar dataKey="wet" name="Wet" stackId="a" fill="#06b6d4" />
                    <Bar dataKey="dry" name="Dry" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

// ===== PREDICTIVE LINE CHART (Forecasting) =====
export const PredictiveLineChart = ({ data = [], height = 200 }) => {
    return (
        <div className="w-full chart-animate">
            <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={0}>
                <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                        dataKey="time"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        domain={[0, 100]}
                    />
                    <Tooltip content={<GlassTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: '10px' }} />

                    {/* Historical Data (Solid) */}
                    <Line
                        type="monotone"
                        dataKey="actual"
                        name="Actual Fill"
                        stroke="#2dd4bf"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#2dd4bf' }}
                    />

                    {/* Forecast Data (Dashed) */}
                    <Line
                        type="monotone"
                        dataKey="predicted"
                        name="Forecast"
                        stroke="#a855f7"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                    />

                    {/* Threshold Line */}
                    <Line
                        type="monotone"
                        dataKey="threshold"
                        name="Capacity Limit"
                        stroke="#f43f5e"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        dot={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

// ===== USAGE HEATMAP =====
export const UsageHeatmap = ({ data = [], height = 200 }) => {
    // Expects data format: [{ hour: '08:00', day: 'Mon', value: 85 }, ...]
    // Simplified visualization using ScatterChart or specialized heatmap logic
    // For this implementation, we'll use a 7-day BarChart representation for "Peak Hours"

    return (
        <div className="w-full chart-animate">
            <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={0}>
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                        dataKey="hour"
                        fontSize={10}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b' }}
                    />
                    <YAxis
                        fontSize={10}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b' }}
                    />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<GlassTooltip />} />
                    <Bar dataKey="value" name="Activity Level" radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.value > 80 ? '#f43f5e' : entry.value > 50 ? '#f59e0b' : '#10b981'}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

// ===== SUSTAINABILITY GAUGE =====
export const SustainabilityGauge = ({ score = 85, height = 200 }) => {
    const data = [
        { name: 'Score', value: score, fill: '#10b981' },
        { name: 'Remaining', value: 100 - score, fill: 'rgba(255,255,255,0.1)' }
    ];

    return (
        <div className="w-full h-full flex items-center justify-center relative chart-animate">
            <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={0}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="70%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius="70%"
                        outerRadius="90%"
                        paddingAngle={0}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                <span className="text-4xl font-bold font-mono text-white tracking-tighter">
                    {score}%
                </span>
                <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider mt-1">
                    Eco Score
                </span>
            </div>
        </div>
    );
};
