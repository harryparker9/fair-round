"use client"

import { useState } from "react"
import { useArnieHelp } from "./arnie-help-context"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"

export function ArnieHelpWidget() {
    const { content } = useArnieHelp()
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            {/* Floating Trigger */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-[100] group animate-fade-in-up"
            >
                <div className="relative w-16 h-16 transition-transform group-hover:scale-110 duration-300">
                    <div className="absolute inset-0 bg-pint-gold/20 rounded-full animate-ping opacity-20" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/arnie.png"
                        alt="Ask Arnie"
                        className="w-full h-full object-cover rounded-full border-2 border-pint-gold shadow-[0_0_20px_rgba(255,215,0,0.3)] bg-charcoal"
                    />
                    <div className="absolute -top-2 -right-2 bg-pint-gold text-charcoal text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        Help
                    </div>
                </div>
            </button>

            {/* Glass Modal */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[101] flex items-end justify-center sm:items-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />

                        {/* Content Panel */}
                        <motion.div
                            initial={{ y: "100%", opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: "100%", opacity: 0, scale: 0.95 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-lg bg-charcoal/80 border border-white/10 shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[80vh]"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5 backdrop-blur-xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full overflow-hidden border border-pint-gold/50 bg-pint-gold/10">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src="/arnie.png" alt="Arnie" className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <h3 className="text-pint-gold font-bold text-lg leading-none">Arnie</h3>
                                        <p className="text-white/40 text-xs font-medium uppercase tracking-wider mt-1">Your Navigator</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="p-6 overflow-y-auto no-scrollbar space-y-4 text-white/90 leading-relaxed font-light">
                                <h4 className="text-xl font-bold text-white mb-2">{content.title}</h4>
                                <div className="text-sm md:text-base space-y-4 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-1 [&>ul>li]:text-white/80">
                                    {content.content}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 bg-black/20 border-t border-white/5 text-center">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-xs text-white/30 hover:text-white transition-colors uppercase tracking-widest"
                                >
                                    Close Guide
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    )
}
