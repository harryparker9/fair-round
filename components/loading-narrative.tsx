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
    const [phase, setPhase] = useState(0)

    useEffect(() => {
        if (!active) {
            setPhase(0)
            return
        }

        // Phase 1: 0s - 15s (Start)
        setPhase(0)

        // Phase 2: 15s
        const t1 = setTimeout(() => setPhase(1), 12000)

        // Phase 3: 45s
        const t2 = setTimeout(() => setPhase(2), 40000)

        return () => {
            clearTimeout(t1)
            clearTimeout(t2)
        }
    }, [active])

    if (!active) return null

    const MESSAGES = [
        "Right then! I'm sending everyone's start and end points over to Gemini to figure out the rough best areas...",
        "Now for the nitty-gritty. I'm checking with TfL to get the exact travel times, factoring in live delays. This might take a minute...",
        "Almost there. Just narrowing it down to the top 3 fairest meeting points..."
    ]

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-500">
            {/* Glass Modal */}
            <div className="relative w-full max-w-lg bg-charcoal/80 border border-white/10 shadow-2xl rounded-3xl overflow-hidden flex flex-col mx-4 p-8 items-center text-center">

                {/* Arnie Image (Static/Breathing, no bobbing) */}
                <div className="relative w-32 h-32 mb-6">
                    <div className="absolute inset-0 bg-pint-gold/20 rounded-full blur-xl animate-pulse" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/arnie.png"
                        alt="Arnie"
                        className="w-full h-full object-cover rounded-full border-4 border-pint-gold shadow-lg bg-charcoal relative z-10"
                    />
                </div>

                <h3 className="text-pint-gold font-bold text-2xl mb-2">Crunching the Numbers</h3>

                <div className="h-24 relative w-full flex items-center justify-center">
                    <AnimatePresence mode='wait'>
                        <motion.p
                            key={phase}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.5 }}
                            className="text-white/90 text-lg font-light leading-relaxed"
                        >
                            {MESSAGES[phase]}
                        </motion.p>
                    </AnimatePresence>
                </div>

                {/* Progress Bar (Visual only, approximating 60s) */}
                <div className="w-full h-1 bg-white/10 rounded-full mt-8 overflow-hidden">
                    <motion.div
                        className="h-full bg-pint-gold"
                        initial={{ width: "0%" }}
                        animate={{ width: "95%" }}
                        transition={{ duration: 60, ease: "linear" }}
                    />
                </div>
            </div>
        </div>
    )
}
