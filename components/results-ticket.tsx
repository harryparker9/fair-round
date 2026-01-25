"use client"

import { forwardRef } from "react"
import { PubRecommendation, PartyMember } from "@/types"
import { Star, MapPin, Beer } from "lucide-react"

interface ResultsTicketProps {
    pub: PubRecommendation
    members: PartyMember[]
}

export const ResultsTicket = forwardRef<HTMLDivElement, ResultsTicketProps>(({ pub, members }, ref) => {
    return (
        <div
            ref={ref}
            className="w-full bg-charcoal text-white p-6 rounded-3xl border-2 border-pint-gold shadow-[0_0_30px_rgba(255,215,0,0.15)] relative overflow-hidden"
            style={{ fontFamily: 'Inter, sans-serif' }}
        >
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                    <h1 className="text-2xl font-black text-pint-gold tracking-tighter uppercase leading-none mb-1">
                        Fair Round
                    </h1>
                    <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase">
                        Official Selection
                    </p>
                </div>
                <div className="bg-pint-gold text-charcoal font-bold px-3 py-1 rounded-full text-xs shadow-lg">
                    {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </div>
            </div>

            {/* Winner Main */}
            <div className="mb-6 relative z-10">
                <div className="text-6xl mb-2">🏆</div>
                <h2 className="text-3xl font-bold leading-tight mb-2">{pub.name}</h2>
                <div className="flex items-center gap-2 text-white/50 text-sm mb-4">
                    <MapPin className="w-4 h-4" />
                    <span>{pub.vicinity}</span>
                </div>

                <div className="bg-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                    <p className="text-lg italic text-pint-gold/90 font-medium">"{pub.vibe_summary}"</p>
                </div>
            </div>

            {/* Attendees */}
            <div className="mb-6 relative z-10">
                <div className="text-[10px] uppercase text-white/30 font-bold mb-2 tracking-widest">Crew ({members.length})</div>
                <div className="flex flex-wrap gap-2">
                    {members.map(m => (
                        <div key={m.id} className="w-8 h-8 rounded-full border border-white/20 bg-black/50 overflow-hidden relative">
                            {m.photo_path ? (
                                <img
                                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/temporary_selfies/${m.photo_path}`}
                                    className="w-full h-full object-cover transform scale-x-[-1]"
                                    alt={m.name}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white/50">
                                    {m.name.charAt(0)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Fairness Score */}
            <div className="flex justify-between items-end border-t border-white/10 pt-4 relative z-10">
                <div className="flex items-center gap-2">
                    <Beer className="w-5 h-5 text-pint-gold" />
                    <span className="font-bold text-white/60 text-sm">Valid Round Verified</span>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-black text-white">{Math.round(pub.fairness_score)}</div>
                    <div className="text-[8px] uppercase text-white/30 font-bold tracking-widest">Fairness Score</div>
                </div>
            </div>
        </div>
    )
})

ResultsTicket.displayName = 'ResultsTicket'
