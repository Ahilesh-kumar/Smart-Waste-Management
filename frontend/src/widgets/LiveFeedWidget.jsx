
import React from 'react';
import clsx from 'clsx';
import {
    Maximize2, PictureInPicture, Camera, Activity,
    Wifi, WifiOff, AlertTriangle, Zap,
    RotateCw, Flashlight
} from 'lucide-react';

export const LiveFeedWidget = ({
    camUrl = '',
    isConnected = false,
    isTorchOn = false,
    toggleTorch = () => { },
    togglePiP = () => { },
    toggleFullscreen = () => { },
    aiData = { class: 'Scanning...', confidence: 0 },
    boxPos = null,
    rotation = 0,
    setRotation = () => { },
    fps = 0,
    latency = 0,
    theme
}) => {
    const [hasFeedError, setHasFeedError] = React.useState(false);

    // Reset error when URL changes
    React.useEffect(() => {
        setHasFeedError(false);
    }, [camUrl]);

    return (
        <div className="relative w-full h-full rounded-3xl overflow-hidden group border border-white/10 bg-black shadow-2xl">
            {/* Live Feed Image - Optimized for streaming performance */}
            {!hasFeedError ? (
                <img
                    id="live-feed-img"
                    src={`http://${camUrl}/video`}
                    alt="Live Stream"
                    className={clsx(
                        "w-full h-full object-cover",
                        !isConnected && "grayscale opacity-50"
                    )}
                    style={{
                        transform: `rotate(${rotation}deg) translateZ(0)`,
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        // GPU acceleration for smooth streaming
                        willChange: rotation !== 0 ? 'transform' : 'auto'
                    }}
                    onError={() => setHasFeedError(true)}
                    // Disable lazy loading for live stream
                    loading="eager"
                    decoding="async"
                />
            ) : (
                /* Enhanced Offline/Error State */
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/90 backdrop-blur-md">
                    <div className="p-4 rounded-full bg-white/5 border border-white/10 shadow-[0_0_30px_rgba(100,116,139,0.2)] mb-4 animate-pulse">
                        <Camera size={48} className="text-slate-400 opacity-80" />
                    </div>
                    <p className="font-mono text-sm tracking-widest uppercase text-slate-400 font-bold mb-1">Feed Unavailable</p>
                    <p className="text-xs text-slate-500">Check connection to {camUrl}</p>
                    <button
                        onClick={() => setHasFeedError(false)}
                        className="mt-6 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-teal-400 transition-colors flex items-center gap-2"
                    >
                        <RotateCw size={12} />
                        RETRY CONNECTION
                    </button>
                </div>
            )}

            {/* Connecting Overlay (when not errored but not connected) */}
            {!isConnected && !hasFeedError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-10 pointer-events-none">
                    <div className="w-12 h-12 rounded-full border-2 border-teal-500/30 border-t-teal-500 animate-spin mb-4" />
                    <p className="font-mono text-xs tracking-widest uppercase text-teal-400">System Connecting...</p>
                </div>
            )}

            {/* AI Bounding Box Overlay */}
            {boxPos && (
                <div
                    className="absolute border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)] z-10 transition-all duration-50 ease-out rounded-lg"
                    style={{
                        left: `${boxPos.x}px`,
                        top: `${boxPos.y}px`,
                        width: `${boxPos.w}px`,
                        height: `${boxPos.h}px`,
                    }}
                >
                    <div className="absolute -top-6 left-0 bg-cyan-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-t-sm uppercase tracking-wider flex items-center gap-1">
                        <Activity size={10} />
                        {aiData.class} {(aiData.confidence * 100).toFixed(0)}%
                    </div>
                </div>
            )}

            {/* Top Bar: Connection & AI Confidence */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start z-20 pointer-events-none">
                <div className="flex gap-2 pointer-events-auto">
                    <div className={clsx(
                        "px-3 py-1.5 rounded-full backdrop-blur-md border flex items-center gap-2 transition-all",
                        isConnected ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-rose-500/20 border-rose-500/30 text-rose-400 animate-pulse"
                    )}>
                        {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                        <span className="text-xs font-bold tracking-wide">{isConnected ? "ONLINE" : "OFFLINE"}</span>
                    </div>
                </div>

                <div className="flex flex-col gap-2 items-end">
                    <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs font-mono text-cyan-400">
                        FPS: {fps}
                    </div>
                    <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs font-mono text-amber-400">
                        {latency}ms
                    </div>
                </div>
            </div>

            {/* Bottom Bar: Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex justify-between items-end z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex gap-2 pointer-events-auto">
                    <button
                        onClick={toggleTorch}
                        className={clsx(
                            "p-2.5 rounded-xl backdrop-blur-md border transition-all hover:scale-105 active:scale-95",
                            isTorchOn ? "bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                        )}
                        title="Toggle Torch"
                    >
                        {isTorchOn ? <Zap size={18} fill="currentColor" /> : <Flashlight size={18} />}
                    </button>
                    <button
                        onClick={() => setRotation(r => (r + 90) % 360)}
                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 backdrop-blur-md hover:bg-white/10 hover:scale-105 active:scale-95 transition-all"
                        title="Rotate Feed"
                    >
                        <RotateCw size={18} />
                    </button>
                </div>

                <div className="flex gap-2 pointer-events-auto">
                    <button
                        onClick={togglePiP}
                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 backdrop-blur-md hover:bg-white/10 hover:scale-105 active:scale-95 transition-all"
                        title="Picture in Picture"
                    >
                        <PictureInPicture size={18} />
                    </button>
                    <button
                        onClick={toggleFullscreen}
                        className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 backdrop-blur-md hover:bg-cyan-500/30 hover:scale-105 active:scale-95 transition-all"
                        title="Fullscreen"
                    >
                        <Maximize2 size={18} />
                    </button>
                </div>
            </div>

            {/* AI Scanning Effect Overlay - CSS-based for performance */}
            <div
                className="absolute inset-0 pointer-events-none opacity-10 mix-blend-overlay"
                style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.03) 2px, rgba(0,255,255,0.03) 4px)',
                    backgroundSize: '100% 4px'
                }}
            />
            <div className="absolute inset-0 pointer-events-none bg-gradient-radial from-transparent to-black/40" />
        </div>
    );
};
