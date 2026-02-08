"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AreaOption, PartyMember } from "@/types"
import { cn } from "@/lib/utils"
// import { Button } from "@/components/ui/button" // Assuming standard button
import { Users, Train, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react"

// Generic Button for consistency if not imported
const Button = ({ className, variant, ...props }: any) => (
    <button className={cn(
        "px-4 py-2 rounded-lg font-bold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
        variant === "primary" ? "bg-pint-gold text-charcoal shadow-[0_0_15px_rgba(255,215,0,0.4)] hover:shadow-[0_0_25px_rgba(255,215,0,0.6)] hover:bg-pint-gold-light" : "bg-white/10 text-white hover:bg-white/20",
        className
    )} {...props} />
)

interface AreaVotingViewProps {
    roundId: string
    options: AreaOption[]
    members: PartyMember[]
    currentUserMemberId?: string
    isHost?: boolean
    onVote: (areaId: string) => Promise<void>
    onStageChange: (newStage: 'pub_voting', winningAreaId?: string) => Promise<void>
    aiStrategy?: string // New: Global Narrative
}

export function AreaVotingView({ roundId, options, members, currentUserMemberId, isHost, onVote, onStageChange, aiStrategy }: AreaVotingViewProps) {
    const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)
    const [expandedAreaId, setExpandedAreaId] = useState<string | null>(null) // For details
    const [isFinalizing, setIsFinalizing] = useState(false)
    const [filters, setFilters] = useState<string[]>([]) // For Pub Search filters later?

    // Calculate votes (in a real app, this would be live from Supabase, but for now we simulate local optimistic selection or passed props)
    // Actually, members have `vote_area_id`.
    const getVoteCount = (areaId: string) => members.filter(m => m.vote_area_id === areaId).length
    const hasVoted = members.some(m => m.id === currentUserMemberId && m.vote_area_id)

    const handleVote = async (areaId: string) => {
        // Optimistic update handled by parent usually, but we call onVote
        await onVote(areaId)
    }

    const handleFinalize = async (areaId: string) => {
        setIsFinalizing(true)
        // host locks it in
        // Ideally we update the round.winning_area_id (not yet in schema? We use winning_pub_id usually, but maybe we need intermediate step?)
        // For this flow, we assume onStageChange('pub_voting') will handle the backend trigger to find pubs for areaId.
        // But we probably need to tell backend *which* area won if it's not strictly vote based.
        // We'll assume the backend checks votes or we pass it? 
        // For simplicity: We'll assume the parent `onStageChange` knows the winner or we pass it via a separate setter if needed.
        // Actually, let's assume `onVote` has set the state, and `onStageChange` just transitions. 
        // BUT, if host overrides, we might need a specific "Pick this" action.
        // Let's assume the highest voted is picked automatically OR host picks. 
        // Let's act as if clicking "Lock In" confirms the current Leader.
        await onStageChange('pub_voting', areaId)
    }

    // Sort options by fairness score or vote count?
    // User wants "Easiest" (Lowest Score) first.
    const sortedOptions = [...options].sort((a, b) => (a.scoring?.avg_time || 0) - (b.scoring?.avg_time || 0))

    const currentLeader = sortedOptions.reduce((prev, current) => (getVoteCount(current.id) > getVoteCount(prev.id) ? current : prev), sortedOptions[0])

    return (
        <div className="flex flex-col h-full relative overflow-hidden">
            {/* Header / Context */}
            <div className="px-6 pt-4 pb-2 z-10 shrink-0 bg-gradient-to-b from-charcoal to-transparent">
                <h2 className="text-xl font-headline text-white mb-1">Where are we meeting?</h2>
                <p className="text-sm text-white/60 mb-3">Vote for the best compromise.</p>

                {/* AI Global Strategy Card */}
                {aiStrategy && (
                    <div className="bg-pint-gold/5 border border-pint-gold/10 p-3 rounded-xl mb-2 flex gap-3">
                        <div className="shrink-0 flex flex-col items-center pt-1">
                            <div className="w-10 h-10 rounded-full bg-pint-gold/10 border border-pint-gold text-charcoal flex items-center justify-center overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/arnie.png" alt="Arnie" className="w-full h-full object-cover transform scale-125 translate-y-1" />
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-pint-gold font-bold uppercase tracking-wider mb-0.5">Arnie's Thoughts</p>
                            <p className="text-sm text-white/90 italic leading-relaxed">"{aiStrategy}"</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Scrollable Options */}
            <div className="flex-1 overflow-y-auto px-6 pb-32 space-y-4 no-scrollbar">
                {sortedOptions.map((area, index) => {
                    const votes = getVoteCount(area.id)
                    const isSelected = members.find(m => m.id === currentUserMemberId)?.vote_area_id === area.id
                    const isExpanded = expandedAreaId === area.id

                    return (
                        <motion.div
                            key={area.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={cn(
                                "group relative overflow-hidden rounded-2xl border transition-all duration-300",
                                isSelected
                                    ? "bg-pint-gold/10 border-pint-gold shadow-[0_0_20px_rgba(255,215,0,0.1)]"
                                    : "bg-white/5 border-white/10 hover:border-white/20"
                            )}
                        >
                            {/* Main Card Content */}
                            <div className="p-4 relative z-10">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className={cn("text-lg font-bold", isSelected ? "text-pint-gold" : "text-white")}>
                                                {area.name}
                                            </h3>
                                            {index === 0 && <span className="bg-fairness-green/20 text-fairness-green text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Best Match</span>}
                                        </div>
                                        <p className="text-xs text-white/50 line-clamp-1">{area.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex flex-col items-end">
                                            <div className="text-xs font-mono font-bold text-white leading-none">
                                                <span className="text-fairness-green">Go: {Math.round(Object.values(area.travel_times).reduce((acc, t) => acc + t.to, 0) / Object.values(area.travel_times).length)}m</span>
                                            </div>
                                            <div className="text-xs font-mono font-bold text-white leading-none mt-1">
                                                <span className="text-white/60">Ret: {Math.round(Object.values(area.travel_times).reduce((acc, t) => acc + t.home, 0) / Object.values(area.travel_times).length)}m</span>
                                            </div>
                                        </div>
                                        <div className="text-[9px] text-white/30 uppercase mt-1">Avg Travel</div>
                                    </div>
                                </div>

                                {/* Quick Stats Row */}
                                <div className="flex items-center gap-4 text-xs text-white/40 mb-3">
                                    <div className="flex items-center gap-1.5">
                                        <Users className="w-3 h-3" />
                                        <span className={votes > 0 ? "text-white font-bold" : ""}>{votes} votes</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Train className="w-3 h-3" />
                                        {/* Direct check? Just showing zone if available or mock */}
                                        <span>Zone {area.description.includes('Zone') ? area.description.match(/Zone (\d)/)?.[1] : '?'}</span>
                                    </div>
                                    {area.scoring?.penalty ? (
                                        <div className="flex items-center gap-1.5 text-red-400">
                                            <AlertTriangle className="w-3 h-3" />
                                            <span>Unfair</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-fairness-green">
                                            <CheckCircle2 className="w-3 h-3" />
                                            <span>Fair</span>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 mt-2">
                                    <Button
                                        variant={isSelected ? "primary" : "secondary"}
                                        className="flex-1 h-9 text-xs uppercase tracking-wider"
                                        onClick={() => handleVote(area.id)}
                                    >
                                        {isSelected ? "Voted" : "Vote"}
                                    </Button>
                                    <button
                                        onClick={() => setExpandedAreaId(isExpanded ? null : area.id)}
                                        className="px-3 md:px-4 h-9 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 text-xs font-medium transition-colors"
                                    >
                                        {isExpanded ? "Hide Details" : "Details"}
                                    </button>
                                </div>
                            </div>

                            {/* Detailed Travel Times Dropdown */}
                            {isExpanded && (
                                <div className="bg-black/40 p-4 border-t border-white/5 space-y-4 animate-in slide-in-from-top-2">

                                    {/* AI Rationale (Specific per station) */}
                                    {area.ai_rationale && (
                                        <div className="bg-pint-gold/10 border border-pint-gold/20 p-3 rounded-lg flex gap-3 items-start">
                                            <div className="bg-pint-gold text-charcoal text-[10px] font-bold px-1.5 rounded uppercase tracking-wider mt-0.5">
                                                Arnie
                                            </div>
                                            <p className="text-sm text-pint-gold font-medium italic">"{area.ai_rationale}"</p>
                                        </div>
                                    )}

                                    {/* Methodology / Transparency */}
                                    {area.scoring && (
                                        <div className="bg-white/5 p-3 rounded-lg border border-white/5 space-y-2">
                                            <h4 className="text-xs font-bold text-pint-gold uppercase tracking-wider">Veracity Check</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-[10px] text-white/40 uppercase">Avg Commute</p>
                                                    <p className="text-lg font-mono text-white">{area.scoring.avg_time}m</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-white/40 uppercase">Longest Trip</p>
                                                    <p className="text-lg font-mono text-white">
                                                        {area.scoring.max_time}m
                                                        <span className="text-xs text-white/50 ml-1">({area.scoring.outlier_name})</span>
                                                    </p>
                                                </div>
                                            </div>
                                            {area.scoring.penalty > 0 && (
                                                <div className="text-xs text-red-300 bg-red-900/20 p-2 rounded">
                                                    ⚠️ Penalized because {area.scoring.outlier_name} travels &gt;90mins.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-white/40 uppercase">Full Breakdown</h4>
                                        <div className="grid grid-cols-1 gap-3">
                                            {Object.entries(area.travel_times).map(([memberName, time]) => (
                                                <div key={memberName} className="flex flex-col bg-white/5 p-3 rounded-lg gap-2 border border-white/5">
                                                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                                        <span className="text-sm font-bold text-white/90">{memberName}</span>
                                                        <span className={cn(
                                                            "text-xs font-mono font-bold",
                                                            (time.to + time.home) > 90 ? "text-red-400" : "text-fairness-green"
                                                        )}>
                                                            ({time.to + time.home}m total)
                                                        </span>
                                                    </div>

                                                    {/* Outbound */}
                                                    <div className="flex gap-3 text-xs items-start">
                                                        <div className="min-w-[40px] text-white/30 uppercase tracking-wider text-[10px] pt-0.5">To</div>
                                                        <div className="flex-1">
                                                            <div className="text-white/80">
                                                                <span className="text-white/40">From </span>
                                                                <span className="font-medium text-white">{time.start_name || "Location"}</span>
                                                                <span className="text-white/40"> → </span>
                                                                <span className="font-medium text-white">{area.name}</span>
                                                            </div>
                                                            <div className="text-white/50 mt-0.5 italic">
                                                                {time.summary_to || "Direct"} ({time.to}m)
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Return */}
                                                    <div className="flex gap-3 text-xs items-start">
                                                        <div className="min-w-[40px] text-white/30 uppercase tracking-wider text-[10px] pt-0.5">Back</div>
                                                        <div className="flex-1">
                                                            <div className="text-white/80">
                                                                <span className="text-white/40">To </span>
                                                                <span className="font-medium text-white">{time.end_name || "Same"}</span>
                                                            </div>
                                                            <div className="text-white/50 mt-0.5 italic">
                                                                {time.summary_home || "Direct"} ({time.home}m)
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )
                })}
            </div>

            {/* Host Controls */}
            {
                isHost && sortedOptions.length > 0 && (
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20 pointer-events-none">
                        <div className="glass-panel px-6 py-4 rounded-full flex items-center gap-4 shadow-2xl backdrop-blur-2xl border border-pint-gold/20 pointer-events-auto">
                            <div className="text-right">
                                <p className="text-xs text-white/40 uppercase">Winning Area</p>
                                <p className="text-sm font-bold text-white max-w-[150px] truncate">{currentLeader?.name || "None"}</p>
                            </div>
                            <Button
                                variant="primary"
                                onClick={() => handleFinalize(currentLeader?.id || options[0].id)}
                                disabled={isFinalizing || !currentLeader}
                                className="shadow-[0_0_20px_rgba(255,215,0,0.3)] animate-pulse"
                            >
                                {isFinalizing ? "Finding Pubs..." : "Lock In & Find Pubs"}
                            </Button>
                        </div>
                    </div>
                )
            }

            <div className="text-center text-[10px] text-white/20 pb-4">
                You are: {members.find(m => m.id === currentUserMemberId)?.name || "Unknown"} ({currentUserMemberId})
            </div>
        </div>
    )
}
