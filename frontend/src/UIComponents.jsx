import React, { useState, useEffect, useRef } from 'react';

// ===== ANIMATED COUNTER =====
// Smoothly animates number changes with optional flash effect
export const AnimatedCounter = ({ value, duration = 800, className = '' }) => {
    const [displayValue, setDisplayValue] = useState(value);
    const frameRef = useRef();
    const startTimeRef = useRef();
    const startValueRef = useRef(value);

    useEffect(() => {
        startValueRef.current = displayValue;
        startTimeRef.current = null;

        const animate = (timestamp) => {
            if (!startTimeRef.current) startTimeRef.current = timestamp;
            const progress = timestamp - startTimeRef.current;
            const percentage = Math.min(progress / duration, 1);

            // Ease out expo
            const ease = percentage === 1 ? 1 : 1 - Math.pow(2, -10 * percentage);

            const nextValue = Math.round(startValueRef.current + (value - startValueRef.current) * ease);
            setDisplayValue(nextValue);

            if (percentage < 1) {
                frameRef.current = requestAnimationFrame(animate);
            }
        };

        if (value !== displayValue) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = requestAnimationFrame(animate);
        }

        return () => cancelAnimationFrame(frameRef.current);
    }, [value, duration]);

    return (
        <span className={`${className} tabular-nums relative inline-block`}>
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
        if (percent >= 95) return '#f43f5e'; // Critical - hazard (rose)
        if (percent >= 85) return '#f59e0b'; // Warning - dry (amber)
        if (percent >= 70) return '#a855f7'; // Medium - accent (violet)
        return '#14b8a6'; // Good - primary (teal)
    };

    const actualColor = color === 'auto' ? getColor() :
        color === 'bio' ? 'var(--bio-color)' :
            color === 'dry' ? 'var(--dry-color)' :
                color === 'wet' ? 'var(--wet-color)' :
                    color === 'hazard' ? 'var(--hazard-color)' :
                        `var(--${color}-500)`;

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
                    className="text-white/5"
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
                    className="transition-all duration-1000 ease-out"
                    style={{
                        stroke: actualColor,
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

// ===== MOUSE GLOW CARD =====
// A wrapper that adds a glowing border effect following the mouse
export const MouseGlow = ({ children, className = '', intensity = 'medium' }) => {
    const containerRef = useRef(null);

    const handleMouseMove = (e) => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        container.style.setProperty('--mouse-x', `${x}px`);
        container.style.setProperty('--mouse-y', `${y}px`);
    };

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            className={`group relative overflow-hidden rounded-3xl border border-white/5 bg-white/5 backdrop-blur-md transition-colors hover:border-white/10 ${className}`}
        >
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100"
                style={{
                    background: `radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(20, 184, 166, 0.15), transparent 40%)`
                }}
            />
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100"
                style={{
                    background: `radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(20, 184, 166, 0.4), transparent 40%)`,
                    maskImage: 'linear-gradient(#fff, #fff)',
                    WebkitMaskClip: 'content-box',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                    padding: '1px' // Border width
                }}
            />
            <div className="relative h-full">{children}</div>
        </div>
    );
};

// ===== RIPPLE BUTTON =====
// Button with material design ripple effect & haptic scale
export const RippleButton = ({ children, onClick, className = '', ...props }) => {
    const buttonRef = useRef(null);

    const handleClick = (e) => {
        const button = buttonRef.current;
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        const ripple = document.createElement('span');
        ripple.className = 'absolute rounded-full bg-white/30 animate-ping pointer-events-none';
        ripple.style.width = `${size}px`;
        ripple.style.height = `${size}px`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;

        button.appendChild(ripple);

        if (navigator.vibrate) navigator.vibrate(5);

        setTimeout(() => ripple.remove(), 600);
        onClick?.(e);
    };

    return (
        <button
            ref={buttonRef}
            onClick={handleClick}
            className={`relative overflow-hidden active:scale-95 transition-all duration-200 ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

// ===== TILT CARD =====
// Card with 3D parallax tilt effect & light glare on hover
export const TiltCard = ({ children, className = '', maxTilt = 5, style = {} }) => {
    const cardRef = useRef(null);

    const handleMouseMove = (e) => {
        const card = cardRef.current;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Tilt calculation
        const rotateX = ((y - centerY) / centerY) * -maxTilt;
        const rotateY = ((x - centerX) / centerX) * maxTilt;

        // Apply transformations
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;

        // Update glare position variables
        card.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
        card.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);
    };

    const handleMouseLeave = () => {
        const card = cardRef.current;
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
        // Reset glare to center or fade out depending on CSS
        card.style.setProperty('--mouse-x', '50%');
        card.style.setProperty('--mouse-y', '50%');
    };

    return (
        <div
            ref={cardRef}
            className={`tilt-card-wrapper transition-transform duration-300 ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ transformStyle: 'preserve-3d', ...style }}
        >
            <div className="tilt-glare" />
            <div style={{ transform: 'translateZ(20px)' }}>
                {children}
            </div>
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
