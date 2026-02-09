'use client'

import { useRef, useState, useEffect } from "react"
import { PubRecommendation, PartyMember } from "@/types"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { motion } from "framer-motion"
import { ResultsTicket } from "./results-ticket"
import { toPng } from 'html-to-image'
import { Share2, Download, Loader2 } from "lucide-react"

interface ResultsViewProps {
    recommendations: PubRecommendation[]
    members?: PartyMember[]
    onBack?: () => void
    isHost?: boolean
}

export function ResultsView({ recommendations, members = [], onBack, isHost }: ResultsViewProps) {
    const ticketRef = useRef<HTMLDivElement>(null)
    const [isSharing, setIsSharing] = useState(false)
    const [hasCelebrated, setHasCelebrated] = useState(false)

    // Confetti Effect on Mount
    useEffect(() => {
        if (recommendations.length > 0 && !hasCelebrated) {
            setHasCelebrated(true)
            import('canvas-confetti').then((confetti) => {
                const duration = 3000;
                const end = Date.now() + duration;

                const frame = () => {
                    confetti.default({
                        particleCount: 2,
                        angle: 60,
                        spread: 55,
                        origin: { x: 0 },
                        colors: ['#FFD700', '#FFFFFF']
                    });
                    confetti.default({
                        particleCount: 2,
                        angle: 120,
                        spread: 55,
                        origin: { x: 1 },
                        colors: ['#FFD700', '#FFFFFF']
                    });

                    if (Date.now() < end) {
                        requestAnimationFrame(frame);
                    }
                };
                frame();
            })
        }
    }, [recommendations, hasCelebrated])

    const handleShare = async () => {
        if (!ticketRef.current) return
        setIsSharing(true)

        try {
            // Generate Image
            const dataUrl = await toPng(ticketRef.current, { cacheBust: true, pixelRatio: 2 })

            // Convert to Blob
            const res = await fetch(dataUrl)
            const blob = await res.blob()
            const file = new File([blob], 'fair-round-result.png', { type: 'image/png' })

            // Share API
            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Our Fair Round Winner',
                    text: `We're heading to ${recommendations[0].name}!`,
                })
            } else {
                // Fallback Download
                const link = document.createElement('a')
                link.download = 'fair-round-result.png'
                link.href = dataUrl
                link.click()
            }
        } catch (e) {
            console.error("Share failed", e)
            alert("Could not generate image. Try screenshotting instead!")
        } finally {
            setIsSharing(false)
        }
    }

    return (
        <div className="w-full max-w-lg flex flex-col gap-6 p-4">
            <div className="text-center space-y-2 animate-fade-in-up relative">
                <h2 className="text-3xl font-bold text-white">The Verdict</h2>
                <p className="text-white/60">Here are the fairest spots for your group.</p>


            </div>

            {/* Hidden Ticket for Generation */}
            <div className="absolute top-[-9999px] left-[-9999px]">
                {recommendations[0] && (
                    <div className="w-[400px]">
                        <ResultsTicket ref={ticketRef} pub={recommendations[0]} members={members} />
                    </div>
                )}
            </div>

            {/* Primary Action: Share */}
            {recommendations[0] && (
                <Button
                    variant="secondary"
                    onClick={handleShare}
                    disabled={isSharing}
                    className="w-full border-pint-gold/50 text-pint-gold hover:bg-pint-gold/10 gap-2"
                >
                    {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                    {isSharing ? "Generating..." : "Share Result Card"}
                </Button>
            )}

            <div className="flex flex-col gap-4">
                {recommendations.map((pub, index) => (
                    <motion.div
                        key={pub.place_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className="flex flex-col gap-3 border-white/5 hover:border-pint-gold/30 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-white">{pub.name}</h3>
                                    <p className="text-sm text-white/40">{pub.vicinity}</p>
                                </div>
                                <div className="bg-pint-gold text-black text-xs font-bold px-2 py-1 rounded-full">
                                    #{index + 1}
                                </div>
                            </div>

                            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                <p className="text-sm text-pint-gold/90 italic">"{pub.vibe_summary}"</p>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-white/5">
                                <h4 className="text-[10px] uppercase text-white/40 tracking-wider">Travel Times (Transit/Walk)</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(pub.travel_times).map(([name, time]) => (
                                        <div key={name} className="flex justify-between items-center bg-white/5 px-2 py-1 rounded">
                                            <span className="text-xs text-white/80">{name}</span>
                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-col items-end leading-none">
                                                    <span className={time.to > 45 ? "text-red-400" : "text-fairness-green"}>
                                                        Go: {time.to}m
                                                    </span>
                                                    <span className="text-[10px] text-white/40">
                                                        Ret: {time.home}m
                                                    </span>
                                                </div>
                                                <a
                                                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pub.name + ' ' + pub.vicinity)}&travelmode=transit`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 hover:text-pint-gold transition-colors"
                                                    title="View Route"
                                                >
                                                    <span className="text-[9px] opacity-50">↗</span>
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end text-xs text-pint-gold/80 pt-1">
                                <span>Rating: {pub.rating}⭐</span>
                            </div>

                            <Button
                                variant={index === 0 ? "primary" : "secondary"}
                                className="w-full mt-2"
                                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pub.name + ' ' + pub.vicinity)}`, '_blank')}
                            >
                                Start Journey
                            </Button>
                        </Card>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
