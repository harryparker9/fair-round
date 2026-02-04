"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

const MESSAGES = [
    "Sending locations to Gemini...",
    "Querying TfL for live disruptions...",
    "Calculating the fairest travel times...",
    "Optimizing for fewest changes...",
    "Finding top-rated pubs nearby...",
    "Applying fairness algorithms...",
    "Almost there..."
]

export function LoadingNarrative({ active = false }: { active: boolean }) {
    const [index, setIndex] = useState(0)

    useEffect(() => {
        if (!active) return
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % MESSAGES.length)
        }, 2500)
        return () => clearInterval(interval)
    }, [active])

    if (!active) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 backdrop-blur-md animate-in fade-in duration-500">
            <div className="bg-white/10 border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4">
                <div className="relative w-24 h-24 mb-6 animate-bounce duration-[2000ms]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/arnie.png" alt="Arnie" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]" />
                </div>

                <h3 className="text-pint-gold font-headline text-xl mb-4">Working on it...</h3>

                <div className="h-8 relative w-full flex justify-center overflow-hidden">
                    <AnimatePresence mode='wait'>
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-white/80 text-sm font-medium text-center absolute w-full"
                        >
                            {MESSAGES[index]}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
