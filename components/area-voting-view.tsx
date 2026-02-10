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
    const [customLocationNames, setCustomLocationNames] = useState<Record<string, string>>({})

    // Calculate votes
    const getVoteCount = (areaId: string) => members.filter(m => m.vote_area_id === areaId).length

    const handleVote = async (areaId: string) => {
        await onVote(areaId)
    }

    const handleFinalize = async (areaId: string) => {
        setIsFinalizing(true)
        await onStageChange('pub_voting', areaId)
    }

    // Sort options by fairness score (Lowest Avg Time first)
    const sortedOptions = [...options].sort((a, b) => (a.scoring?.avg_time || 0) - (b.scoring?.avg_time || 0))

    const currentLeader = sortedOptions.reduce((prev, current) => (getVoteCount(current.id) > getVoteCount(prev.id) ? current : prev), sortedOptions[0])

    // Geocoding Effect for Custom Locations
    useEffect(() => {
        const fetchLocationNames = async () => {
            const geocoder = new google.maps.Geocoder()
            const newNames: Record<string, string> = {}

            const customEndMembers = members.filter(m => m.end_location_type === 'custom' && m.end_lat && m.end_lng)

            await Promise.all(customEndMembers.map(async (m) => {
                try {
                    const response = await geocoder.geocode({ location: { lat: m.end_lat!, lng: m.end_lng! } })
                    if (response.results[0]) {
                        // Try to find neighborhood or locality
                        const locality = response.results[0].address_components.find(c => c.types.includes('neighborhood'))?.long_name
                            || response.results[0].address_components.find(c => c.types.includes('locality'))?.long_name
                            || response.results[0].address_components.find(c => c.types.includes('postal_town'))?.long_name
                            || "London Area"
                        newNames[m.id] = locality
                    }
                } catch (e) {
                    console.error("Geocoding failed for member", m.id, e)
                }
            }))

            if (Object.keys(newNames).length > 0) {
                setCustomLocationNames(prev => ({ ...prev, ...newNames }))
            }
        }

        // Only run if google is available (it should be loaded by layout/map)
        if (typeof google !== 'undefined' && members.length > 0) {
            fetchLocationNames()
        }
    }, [members])

    const getDisplayName = (originalName: string | undefined, memberId: string, type: 'start' | 'end') => {
        if (!originalName) return "Location"
        if (originalName === 'Custom Return' && type === 'end') {
            return customLocationNames[memberId] || "London Area"
        }
        return originalName
    }

    return (
        <div className="flex flex-col h-full relative overflow-hidden">
            {/* Header / Context */}
            <div className="px-6 pt-4 pb-2 z-10 shrink-0 bg-gradient-to-b from-charcoal to-transparent">
                <h2 className="text-xl font-headline text-white mb-1">Where are we meeting?</h2>
                <div className="flex justify-between items-end">
                    <p className="text-sm text-white/60 mb-3">Vote for the best compromise.</p>
                </div>

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

                    // Calculate Avg Times
                    const avgTo = Math.round(Object.values(area.travel_times).reduce((acc, t) => acc + t.to, 0) / Object.values(area.travel_times).length)
                    const avgHome = Math.round(Object.values(area.travel_times).reduce((acc, t) => acc + t.home, 0) / Object.values(area.travel_times).length)

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

                                <div className="text-center mb-3">
                                    <h3 className={cn("text-xl font-bold mb-2", isSelected ? "text-pint-gold" : "text-white")}>
                                        {area.name}
                                    </h3>

                                    {/* Avg Times - Vertical and Clearer - ROUND 2 FIX */}
                                    <div className="flex flex-col items-center gap-1.5 text-xs font-medium text-white/80">
                                        <div className="bg-white/5 px-3 py-1.5 rounded-lg w-full max-w-[200px] flex justify-between items-center">
                                            <span className="text-white/50 text-[10px] uppercase tracking-wider">Avg travel to {area.name}</span>
                                            <span className="font-mono font-bold text-fairness-green text-sm">{avgTo}m</span>
                                        </div>
                                        <div className="bg-white/5 px-3 py-1.5 rounded-lg w-full max-w-[200px] flex justify-between items-center">
                                            <span className="text-white/50 text-[10px] uppercase tracking-wider">Avg return travel</span>
                                            <span className="font-mono font-bold text-white/80 text-sm">{avgHome}m</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 mb-2 mt-4">
                                    <Button
                                        variant={isSelected ? "primary" : "secondary"}
                                        className="flex-1 h-10 text-xs uppercase tracking-wider"
                                        onClick={() => handleVote(area.id)}
                                    >
                                        {isSelected ? "Voted" : "Vote"}
                                    </Button>
                                    <button
                                        onClick={() => setExpandedAreaId(isExpanded ? null : area.id)}
                                        className="px-4 h-10 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 text-xs font-medium transition-colors"
                                    >
                                        {isExpanded ? "Hide Details" : "Details"}
                                    </button>
                                </div>

                                {/* Vote Count */}
                                {votes > 0 && (
                                    <div className="text-center">
                                        <span className="text-xs font-bold text-pint-gold">{votes} vote{votes !== 1 ? 's' : ''}</span>
                                    </div>
                                )}
                            </div>

                            {/* Detailed Travel Times Dropdown */}
                            {isExpanded && (
                                <div className="bg-black/40 p-4 border-t border-white/5 space-y-4 animate-in slide-in-from-top-2">

                                    {/* AI Rationale */}
                                    {area.ai_rationale && (
                                        <div className="bg-pint-gold/10 border border-pint-gold/20 p-3 rounded-lg flex gap-3 items-start">
                                            <div className="bg-pint-gold text-charcoal text-[10px] font-bold px-1.5 rounded uppercase tracking-wider mt-0.5">
                                                Arnie
                                            </div>
                                            <p className="text-sm text-pint-gold font-medium italic">"{area.ai_rationale}"</p>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-white/40 uppercase">Full Breakdown</h4>
                                        <div className="grid grid-cols-1 gap-3">
                                            {/* Note: The key in travel_times is actually the Name, not ID, from backend */}
                                            {Object.entries(area.travel_times).map(([keyName, time]) => {
                                                // Try to find member by name if key is name, or ID if ID. 
                                                // Backend currently sends Name as key.
                                                // Map ID to Member to check for custom location masking.
                                                const member = members.find(m => m.name === keyName || m.id === keyName)
                                                const displayMemberId = member?.id || keyName
                                                const isTotalLong = (time.to + time.home) > 90

                                                return (
                                                    <div key={keyName} className="flex flex-col bg-white/5 p-3 rounded-lg gap-2 border border-white/5">
                                                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                                            {/* User requested actual name, keyName is the name */}
                                                            <span className="text-sm font-bold text-white/90">{keyName}</span>
                                                            <span className={cn(
                                                                "text-xs font-mono font-bold",
                                                                isTotalLong ? "text-red-400" : "text-fairness-green"
                                                            )}>
                                                                ({time.to + time.home}m total)
                                                            </span>
                                                        </div>

                                                        {/* Outbound - ROUND 2 FIX: Added journey summary */}
                                                        <div className="flex flex-col gap-1 text-xs">
                                                            <div className="flex justify-between items-center text-white/40 text-[10px] uppercase tracking-wider">
                                                                <span>To Station</span>
                                                                <span className="font-mono font-bold text-fairness-green text-xs">{time.to}m</span>
                                                            </div>
                                                            <div className="text-white/80">
                                                                {time.summary_to || `${time.start_name} → ${area.name}`}
                                                            </div>
                                                        </div>

                                                        {/* Return - ROUND 2 FIX: Added journey summary + masking */}
                                                        <div className="flex flex-col gap-1 text-xs border-t border-white/5 pt-2">
                                                            <div className="flex justify-between items-center text-white/40 text-[10px] uppercase tracking-wider">
                                                                <span>Return Journey</span>
                                                                <span className="font-mono font-bold text-fairness-green text-xs">{time.home}m</span>
                                                            </div>
                                                            <div className="text-white/80">
                                                                {/* Use custom location masking if applicable */}
                                                                {time.summary_home ? (
                                                                    time.summary_home
                                                                ) : (
                                                                    `${area.name} → ${getDisplayName(time.end_name, displayMemberId, 'end')}`
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
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

            {/* Waiting Message for Guest */}
            {members.find(m => m.id === currentUserMemberId)?.vote_area_id && !isHost && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-charcoal/95 backdrop-blur border-t border-white/10 flex justify-center z-50 animate-slide-up">
                    <p className="text-pint-gold text-sm font-bold animate-pulse">
                        Waiting for host to confirm...
                    </p>
                </div>
            )}
        </div>
    )
}
