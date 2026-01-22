'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AreaOption, PartyMember } from '@/types'
import { Button } from '@/components/ui/button'
import { castVote, finalizeVoting } from '@/actions/voting'
import { cn } from '@/lib/utils'

interface AreaVotingViewProps {
    roundId: string
    options: AreaOption[]
    members: PartyMember[]
    currentUserMemberId?: string
    isHost: boolean
    onVote?: (areaId: string) => void // Callback with areaId for optimistic update
    onStageChange?: (stage: 'results') => void
}

export function AreaVotingView({ roundId, options, members, currentUserMemberId, isHost, onVote, onStageChange }: AreaVotingViewProps) {
    const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)
    const [expandedAreaId, setExpandedAreaId] = useState<string | null>(null)
    const [isFinalizing, setIsFinalizing] = useState(false)
    const [filters, setFilters] = useState<string[]>([])

    const toggleFilter = (f: string) => {
        setFilters(prev =>
            prev.includes(f) ? prev.filter(i => i !== f) : [...prev, f]
        )
    }

    // Calculate votes per area
    const getVoteCount = (areaId: string) => {
        return members.filter(m => m.vote_area_id === areaId).length
    }

    const hasVoted = members.find(m => m.id === currentUserMemberId)?.vote_area_id

    const handleVote = async (areaId: string) => {
        if (!currentUserMemberId) {
            alert("Error: You are not identified as a member. Try re-joining.")
            return
        }
        setSelectedAreaId(areaId)

        // 1. Optimistic Update (Immediate Feedback)
        if (onVote) onVote(areaId)

        try {
            // 2. Network Request
            await castVote(currentUserMemberId, areaId)
        } catch (err: any) {
            console.error("Vote failed", err)
            alert("Failed to cast vote: " + err.message)
            // Ideally revert optimistic update here, but for MVP keep it simple
        }
    }

    const handleFinalize = async (areaId: string) => {
        setIsFinalizing(true)
        try {
            // @ts-ignore
            const res = await finalizeVoting(roundId, areaId, filters) // Pass active filters
            if (res.success) {
                // Success! Optimistically switch stage
                if (onStageChange) onStageChange('results') // This actually maps to 'pub_voting' in manager
            } else {
                setIsFinalizing(false)
                alert(`Server Error: ${res.error}`)
            }
        } catch (err: any) {
            console.error("Finalize failed", err)
            setIsFinalizing(false)
            alert(`Network Error: ${err.message || "Unknown error"}`)
        }
    }

    // Determine current winner for Host Logic
    const sortedOptions = [...options].sort((a, b) => getVoteCount(b.id) - getVoteCount(a.id))
    const currentLeader = sortedOptions[0]

    return (
        <div className="w-full max-w-lg space-y-6 p-4 pb-32">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-white tracking-wide">Vote for Area</h2>
                <p className="text-white/60">Choose the best neighborhood for the group.</p>
            </div>

            <div className="flex flex-col gap-4">
                {options.map((area, index) => {
                    const votes = getVoteCount(area.id)
                    // Robust string comparison for mixed types (number vs string)
                    const isSelected = String(hasVoted) === String(area.id)
                    const isExpanded = expandedAreaId === area.id

                    return (
                        <motion.div
                            key={area.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={cn(
                                "relative overflow-hidden rounded-2xl border transition-all duration-300",
                                isSelected
                                    ? "bg-pint-gold/10 border-pint-gold shadow-[0_0_15px_rgba(255,215,0,0.2)]"
                                    : "bg-white/5 border-white/10 hover:bg-white/10"
                            )}
                        >
                            <div className="p-5 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{area.name}</h3>
                                        <p className="text-sm text-white/60 italic">{area.description}</p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-2xl font-bold text-pint-gold">{votes}</span>
                                        <span className="text-xs text-white/40 uppercase tracking-widest">Votes</span>
                                    </div>
                                </div>

                                {/* Voter Avatars */}
                                <div className="flex -space-x-2 py-2 min-h-[40px]">
                                    {members.filter(m => m.vote_area_id === area.id).map(voter => (
                                        <div key={voter.id} className="relative w-8 h-8 rounded-full border-2 border-black overflow-hidden bg-gray-700" title={voter.name}>
                                            {voter.photo_path ? (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img
                                                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/temporary_selfies/${voter.photo_path}`}
                                                    alt={voter.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[10px] items-center text-white font-bold">
                                                    {voter.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {getVoteCount(area.id) === 0 && (
                                        <span className="text-xs text-white/20 self-center">No votes yet</span>
                                    )}
                                </div>

                                <div className="flex gap-2 mt-2">
                                    <Button
                                        variant={isSelected ? "primary" : "secondary"}
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleVote(area.id)}
                                        disabled={isFinalizing}
                                    >
                                        {isSelected ? "Voted ✅" : "Vote for this Area"}
                                    </Button>
                                    <button
                                        onClick={() => setExpandedAreaId(isExpanded ? null : area.id)}
                                        className="px-3 py-2 text-xs text-white/40 hover:text-white border border-white/10 rounded-lg transition-colors"
                                    >
                                        {isExpanded ? "Hide Details" : "Why this station?"}
                                    </button>
                                </div>
                            </div>

                            {/* Detailed Travel Times Dropdown */}
                            {isExpanded && (
                                <div className="bg-black/40 p-4 border-t border-white/5 space-y-4 animate-in slide-in-from-top-2">

                                    {/* AI Rationale */}
                                    {area.ai_rationale && (
                                        <div className="bg-pint-gold/10 border border-pint-gold/20 p-3 rounded-lg flex gap-3 items-start">
                                            <div className="bg-pint-gold text-charcoal text-[10px] font-bold px-1.5 rounded uppercase tracking-wider mt-0.5">
                                                AI
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

                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-white/40 uppercase">Full Breakdown</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {Object.entries(area.travel_times).map(([memberName, time]) => (
                                                <div key={memberName} className="flex justify-between items-center bg-white/5 px-2 py-1 rounded">
                                                    <span className="text-xs text-white/80">{memberName}</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex flex-col items-end leading-none">
                                                            <span className={cn(
                                                                "text-xs font-mono",
                                                                time.to > 45 ? "text-red-400" : "text-fairness-green"
                                                            )}>
                                                                {time.to}m
                                                            </span>
                                                            <span className="text-[10px] text-white/30">
                                                                Ret: {time.home}m
                                                            </span>
                                                        </div>
                                                        {/* Link to Google Maps to verify route */}
                                                        <a
                                                            href={`https://www.google.com/maps/dir/?api=1&destination=${area.center.lat},${area.center.lng}&travelmode=transit`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] text-white/30 hover:text-pint-gold"
                                                            title="View Route"
                                                        >
                                                            ↗
                                                        </a>
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

            {
                isHost && (
                    <div className="fixed bottom-6 left-0 right-0 p-4 flex flex-col items-center gap-3 z-50">

                        {/* Filter Toggles */}
                        <div className="flex gap-2 bg-charcoal/90 backdrop-blur border border-white/10 p-1.5 rounded-full shadow-lg">
                            {['garden', 'food', 'sports'].map(f => {
                                const isActive = filters.includes(f)
                                return (
                                    <button
                                        key={f}
                                        onClick={() => toggleFilter(f)}
                                        className={cn(
                                            "px-3 py-1 rounded-full text-xs font-bold transition-all border",
                                            isActive
                                                ? "bg-fairness-green text-black border-fairness-green"
                                                : "bg-transparent text-white/50 border-transparent hover:bg-white/10"
                                        )}
                                    >
                                        {f === 'garden' && '🌳 '}
                                        {f === 'food' && '🍔 '}
                                        {f === 'sports' && '⚽ '}
                                        {f.charAt(0).toUpperCase() + f.slice(1)}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="glass-panel px-6 py-4 rounded-full flex items-center gap-4 shadow-2xl backdrop-blur-2xl border border-pint-gold/20">
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
