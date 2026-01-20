'use client'

import { PubRecommendation } from "@/types"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { motion } from "framer-motion"

interface ResultsViewProps {
    recommendations: PubRecommendation[]
}

export function ResultsView({ recommendations }: ResultsViewProps) {
    return (
        <div className="w-full max-w-lg flex flex-col gap-6 p-4">
            <div className="text-center space-y-2 animate-fade-in-up">
                <h2 className="text-3xl font-bold text-white">The Verdict</h2>
                <p className="text-white/60">Here are the fairest spots for your group.</p>
            </div>

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
                                            <a
                                                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pub.name + ' ' + pub.vicinity)}&travelmode=transit`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 hover:text-pint-gold transition-colors"
                                                title="View Route"
                                            >
                                                <span className={time > 45 ? "text-red-400" : "text-fairness-green"}>
                                                    {time}m
                                                </span>
                                                <span className="text-[9px] opacity-50">↗</span>
                                            </a>
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
