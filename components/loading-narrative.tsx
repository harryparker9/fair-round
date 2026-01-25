"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

const MESSAGES = [
    "Analyzing Transport Links...",
    "Triangulating Fair Midpoint...",
    "Fetching TfL Data...",
    "Checking Pub Ratings...",
    "Optimizing Journey Times...",
    "Ensuring Nobody Walks Too Far...",
    "Consulting the Beer Gods..."
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
        <div className="flex flex-col items-center justify-center space-y-2 h-full">
            <div className="w-6 h-6 border-2 border-pint-gold border-t-transparent rounded-full animate-spin" />
            <div className="h-6 relative w-full flex justify-center overflow-hidden">
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-pint-gold/80 text-xs font-bold uppercase tracking-wider absolute whitespace-nowrap"
                    >
                        {MESSAGES[index]}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    )
}
