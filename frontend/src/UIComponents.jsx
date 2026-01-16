import React, { useState, useEffect, useRef } from 'react';

// ===== ANIMATED COUNTER =====
// Smoothly animates number changes with optional flash effect
export const AnimatedCounter = ({ value, duration = 500, className = '' }) => {
    const [displayValue, setDisplayValue] = useState(value);
    const [isAnimating, setIsAnimating] = useState(false);
    const prevValue = useRef(value);

    useEffect(() => {
        if (prevValue.current !== value) {
            setIsAnimating(true);
            const startValue = prevValue.current;
            const endValue = value;
            const startTime = Date.now();

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // Ease-out cubic
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = Math.round(startValue + (endValue - startValue) * eased);
                setDisplayValue(current);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    setIsAnimating(false);
                    prevValue.current = value;
                }
            };
            requestAnimationFrame(animate);
        }
    }, [value, duration]);

    return (
        <span className={`${className} ${isAnimating ? 'count-pulse text-teal-400' : ''}`}>
            {displayValue}
        </span>
    );
};

// ===== PROGRESS RING =====
// SVG circular progress indicator for bin fill levels
export const ProgressRing = ({
    percent = 0,
    size = 80,
    strokeWidth = 8,
    label = '',
    color = 'teal'
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percent / 100) * circumference;

    const getColor = () => {
        if (percent >= 95) return '#f43f5e'; // Critical - rose
        if (percent >= 85) return '#f59e0b'; // Warning - amber
        if (percent >= 70) return '#a855f7'; // Medium - violet
        return '#14b8a6'; // Good - teal
    };

    const actualColor = color === 'auto' ? getColor() : `var(--${color}-500)`;

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-white/10"
                />
                {/* Progress arc */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={actualColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-700 ease-out"
                    style={{
                        filter: percent >= 85 ? `drop-shadow(0 0 6px ${actualColor})` : 'none'
                    }}
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="stat-number-sm" style={{ color: actualColor }}>{percent}%</span>
                {label && <span className="stat-label text-[10px]">{label}</span>}
            </div>
        </div>
    );
};

// ===== SPARKLINE =====
// Mini inline chart to show trends
export const Sparkline = ({
    data = [],
    width = 60,
    height = 24,
    color = 'teal',
    showTrend = true
}) => {
    if (data.length < 2) return null;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    const trend = data[data.length - 1] - data[0];
    const trendColor = trend >= 0 ? '#10b981' : '#f43f5e';

    return (
        <div className="inline-flex items-center gap-2">
            <svg width={width} height={height} className="overflow-visible">
                <polyline
                    points={points}
                    fill="none"
                    stroke={`var(--${color}-400)`}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                {/* End dot */}
                <circle
                    cx={width}
                    cy={height - ((data[data.length - 1] - min) / range) * height}
                    r="3"
                    fill={`var(--${color}-400)`}
                />
            </svg>
            {showTrend && (
                <span
                    className="text-[10px] font-bold"
                    style={{ color: trendColor }}
                >
                    {trend >= 0 ? '↑' : '↓'}{Math.abs(trend)}
                </span>
            )}
        </div>
    );
};

// ===== SKELETON LOADER =====
// Shimmer placeholder for loading content
export const Skeleton = ({ width = '100%', height = 20, className = '' }) => (
    <div
        className={`skeleton-shimmer rounded-lg ${className}`}
        style={{ width, height }}
    />
);

// ===== LIVE INDICATOR =====
// Pulsing dot component for real-time status
export const LiveIndicator = ({ status = 'online', size = 8 }) => (
    <span
        className={`live-dot ${status === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`}
        style={{ width: size, height: size }}
    />
);

// ===== RIPPLE BUTTON =====
// Button with material design ripple effect
export const RippleButton = ({ children, onClick, className = '', ...props }) => {
    const buttonRef = useRef(null);

    const handleClick = (e) => {
        const button = buttonRef.current;
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        button.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
        onClick?.(e);
    };

    return (
        <button
            ref={buttonRef}
            onClick={handleClick}
            className={`ripple-container ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

// ===== TILT CARD =====
// Card with 3D parallax tilt effect on hover
export const TiltCard = ({ children, className = '', maxTilt = 5 }) => {
    const cardRef = useRef(null);

    const handleMouseMove = (e) => {
        const card = cardRef.current;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -maxTilt;
        const rotateY = ((x - centerX) / centerX) * maxTilt;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    };

    const handleMouseLeave = () => {
        const card = cardRef.current;
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
    };

    return (
        <div
            ref={cardRef}
            className={`transition-transform duration-200 ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {children}
        </div>
    );
};

// ===== STAT CARD =====
// Complete stat card with trend and sparkline
export const StatCard = ({
    title,
    value,
    trend = null,
    sparkData = [],
    icon: Icon,
    color = 'teal',
    className = ''
}) => {
    const trendColor = trend >= 0 ? 'text-emerald-400' : 'text-rose-400';

    return (
        <div className={`card-modern card-modern-dark p-4 ${className}`}>
            <div className="flex justify-between items-start mb-2">
                <span className="stat-label">{title}</span>
                {Icon && (
                    <div className={`category-icon category-icon-${color === 'teal' ? 'bio' : color}`} style={{ width: 28, height: 28 }}>
                        <Icon size={14} className="text-white" />
                    </div>
                )}
            </div>
            <div className="flex items-end justify-between">
                <AnimatedCounter value={value} className={`stat-number text-${color}-400`} />
                <div className="flex flex-col items-end gap-1">
                    {sparkData.length > 0 && <Sparkline data={sparkData} color={color} showTrend={false} />}
                    {trend !== null && (
                        <span className={`text-xs font-bold ${trendColor}`}>
                            {trend >= 0 ? '+' : ''}{trend}%
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
