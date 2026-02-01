"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

const MESSAGES = [
    "Larry is consulting the spirits...",
    "Scanning the ancient ley lines of London...",
    "Larry is asking the Northern Line to behave...",
    "Checking which pubs have the best vibes...",
    "Triangulating the fairest point for everyone...",
    "Larry is polishing the pint glasses...",
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
        <div className="flex flex-col items-center justify-center space-y-2 h-full">
            <div className="relative w-16 h-16 animate-bounce duration-[2000ms]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/larry.png" alt="Larry" className="w-full h-full object-contain" />
            </div>
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
