import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, RotateCcw, Info } from 'lucide-react';
import clsx from 'clsx';

const AnalyticsDetailModal = ({
    isOpen,
    onClose,
    title,
    description,
    children,
    footer
}) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                {/* Backdrop */}
                <motion.div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                />

                {/* Modal Content */}
                <motion.div
                    className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <Maximize2 size={20} className="text-emerald-400" />
                            </div>
                            <h2 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                                {title}
                            </h2>
                            {description && (
                                <div className="relative group">
                                    <button className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-cyan-400 transition-colors">
                                        <Info size={18} />
                                    </button>
                                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 w-64 bg-slate-900/95 border border-white/10 p-3 rounded-xl shadow-xl backdrop-blur-xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto transition-all z-50">
                                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                            {description}
                                        </p>
                                        <div className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-slate-900 border-l border-b border-white/10 transform rotate-45"></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-6 min-h-[400px]">
                        <div className="w-full h-full flex flex-col">
                            {children}
                        </div>
                    </div>

                    {/* Footer (Slider area) */}
                    {footer && (
                        <div className="px-6 py-4 border-t border-white/5 bg-black/20">
                            {footer}
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AnalyticsDetailModal;
