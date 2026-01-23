'use client'

import { useState, useEffect, useRef } from 'react'
import { JoinRoundForm } from '@/components/join-round-form'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ResultsView } from '@/components/results-view'
import { PubRecommendation, AreaOption } from '@/types'
import { supabase } from '@/lib/supabase'
import { startAreaVoting, endRound, regressStage, updatePartyMember } from '@/actions/voting'
import { AreaVotingView } from '@/components/area-voting-view'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { LogOut, Settings, Users, ChevronDown, MapPin } from 'lucide-react'


import { MemberMapModal } from '@/components/member-map-modal'

interface RoundManagerProps {
    roundId: string
    code: string
}

import { PubVotingView } from '@/components/pub-voting-view'
import { confirmPubWinner } from '@/actions/voting'

export function RoundManager({ roundId, code }: RoundManagerProps) {
    const router = useRouter()
    const [joined, setJoined] = useState(false)
    const [loading, setLoading] = useState(true)
    const [recommendations, setRecommendations] = useState<PubRecommendation[] | null>(null)
    const [isEditingSettings, setIsEditingSettings] = useState(false)
    const [mapState, setMapState] = useState<{ isOpen: boolean, mode: 'lobby' | 'voting' | 'results' | 'single', focusedMemberId?: string }>({
        isOpen: false,
        mode: 'lobby'
    })

    // Status States
    const [triangulating, setTriangulating] = useState(false)
    const [generatingAreas, setGeneratingAreas] = useState(false)

    // Data States
    const [stage, setStage] = useState<'lobby' | 'voting' | 'pub_voting' | 'results'>('lobby')
    const [viewingStage, setViewingStage] = useState<'lobby' | 'voting' | 'pub_voting' | 'results' | null>(null) // Review Mode
    const [roundStatus, setRoundStatus] = useState<string>('active')
    const [areaOptions, setAreaOptions] = useState<AreaOption[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [roundHostId, setRoundHostId] = useState<string | null>(null)
    const [winningPubId, setWinningPubId] = useState<string | null>(null)
    const [systemMessage, setSystemMessage] = useState<string | null>(null)
    const [aiStrategy, setAiStrategy] = useState<string | null>(null)
    const lastSystemMessage = useRef<string | null>(null)

    // Data Helpers
    const [stationData, setStationData] = useState<Record<string, { name: string, lat: number, lng: number }>>({})

    // User Identity
    const [myMemberId, setMyMemberId] = useState<string | null>(null)
    const [myUserId, setMyUserId] = useState<string | null>(null)

    // Clear system message after 3 seconds, avoid re-showing same message
    useEffect(() => {
        if (systemMessage) {
            const timer = setTimeout(() => {
                setSystemMessage(null)
                // We keep lastSystemMessage to prevent immediate re-trigger by same payload
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [systemMessage])

    // Load Station Names helper
    const loadStationNames = async (currMembers: any[]) => {
        const ids = new Set<string>()
        currMembers.forEach(m => {
            if (m.start_station_id) ids.add(m.start_station_id)
            if (m.end_station_id) ids.add(m.end_station_id)
        })

        if (ids.size === 0) return

        const { data } = await supabase.from('stations').select('id, name, lat, lng').in('id', Array.from(ids))
        if (data) {
            const map: Record<string, { name: string, lat: number, lng: number }> = {}
            data.forEach(s => map[s.id] = { name: s.name, lat: s.lat, lng: s.lng })
            setStationData(prev => ({ ...prev, ...map }))
        }
    }

    // 1. Check identity
    useEffect(() => {
        const storedJoined = localStorage.getItem(`fair-round-joined-${roundId}`)
        const storedMemberId = localStorage.getItem(`fair-round-member-id-${roundId}`)
        const storedUserId = localStorage.getItem('fair_round_user_id')

        if (storedJoined) setJoined(true)
        if (storedMemberId) setMyMemberId(storedMemberId)
        if (storedUserId) setMyUserId(storedUserId)
        setLoading(false)
    }, [roundId])

    // 2. Fetch Data & Identity (Host check)
    useEffect(() => {
        const initData = async () => {
            const { data: roundData } = await supabase.from('rounds').select('*').eq('id', roundId).single()
            if (roundData) {
                setStage(roundData.stage)
                setRoundStatus(roundData.status)
                setRoundHostId(roundData.host_id)
                setAreaOptions(roundData.area_options || [])

                if (roundData.settings?.winning_pub_id) {
                    setWinningPubId(roundData.settings.winning_pub_id)
                }

                if (roundData.settings?.ai_strategy) {
                    setAiStrategy(roundData.settings.ai_strategy)
                }

                // Set initial message only if new
                if (roundData.settings?.system_message && roundData.settings.system_message !== lastSystemMessage.current) {
                    setSystemMessage(roundData.settings.system_message)
                    lastSystemMessage.current = roundData.settings.system_message
                }

                if (roundData.stage === 'results' || roundData.stage === 'pub_voting') {
                    const { data: cache } = await supabase.from('pub_cache').select('results').eq('round_id', roundId).single()
                    if (cache) setRecommendations(cache.results)
                }
            }

            const { data: memData } = await supabase.from('party_members').select('*').eq('round_id', roundId)
            if (memData) {
                setMembers(memData)
                loadStationNames(memData)
            }
        }
        initData()
    }, [roundId])

    // 3. Realtime Subscription
    useEffect(() => {
        const channel = supabase
            .channel(`round_lobby_${roundId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'party_members', filter: `round_id=eq.${roundId}` },
                async (payload) => {
                    console.log("Realtime Member Update:", payload)
                    // Refresh members to ensure consistency and fetch stations
                    const { data: memData } = await supabase.from('party_members').select('*').eq('round_id', roundId)
                    if (memData) {
                        setMembers(memData)
                        loadStationNames(memData)
                    }
                })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rounds', filter: `id=eq.${roundId}` },
                (payload) => {
                    console.log("Realtime Round Update:", payload)
                    const newRound = payload.new
                    setStage(newRound.stage)
                    setRoundStatus(newRound.status)

                    if (newRound.area_options) setAreaOptions(newRound.area_options)
                    if (newRound.settings?.winning_pub_id) setWinningPubId(newRound.settings.winning_pub_id)
                    if (newRound.settings?.ai_strategy) setAiStrategy(newRound.settings.ai_strategy)

                    if (newRound.settings?.system_message && newRound.settings.system_message !== lastSystemMessage.current) {
                        setSystemMessage(newRound.settings.system_message)
                        lastSystemMessage.current = newRound.settings.system_message
                    }

                    // Fetch recommendations if moving to pub_voting or results
                    if ((newRound.stage === 'pub_voting' || newRound.stage === 'results') && !recommendations) {
                        setTimeout(async () => {
                            const { data: cache } = await supabase.from('pub_cache').select('results').eq('round_id', roundId).single()
                            if (cache) setRecommendations(cache.results)
                        }, 1500)
                    }
                })
            .subscribe((status) => {
                console.log("Realtime Subscription Status:", status)
            })

        return () => { supabase.removeChannel(channel) }
    }, [roundId, recommendations])

    // 4. Force Exit if round ended
    useEffect(() => {
        if (roundStatus === 'ended') {
            alert("The host has ended the party. Returning to home.")
            localStorage.removeItem(`fair-round-joined-${roundId}`)
            localStorage.removeItem(`fair-round-member-id-${roundId}`)
            router.push('/')
        }
    }, [roundStatus, roundId, router])


    const handleJoin = (memberId: string) => {
        setJoined(true)
        setMyMemberId(memberId)
    }

    // HOST ACTIONS
    const isHost = myUserId === roundHostId

    const handleExit = async () => {
        if (isHost) {
            if (componentStatus === 'ended') return; // already ending
            if (!confirm("As Host, exiting will END the party for everyone. Are you sure?")) return;

            try {
                // @ts-ignore
                await endRound(roundId)
            } catch (e) {
                console.error("Failed to end party on server", e)
            } finally {
                // Always exit locally even if server fails
                localStorage.removeItem(`fair-round-joined-${roundId}`)
                localStorage.removeItem(`fair-round-member-id-${roundId}`)
                window.location.href = '/' // Hard reload to clear state
            }
        } else {
            if (!confirm("Leave this party?")) return;
            localStorage.removeItem(`fair-round-joined-${roundId}`)
            localStorage.removeItem(`fair-round-member-id-${roundId}`)
            window.location.href = '/' // Hard reload to clear state
        }
    }

    const handleStartVoting = async () => {
        setGeneratingAreas(true)
        try {
            // @ts-ignore
            const res = await startAreaVoting(roundId)
            if (res.success) {
                setAreaOptions(res.options as AreaOption[])
                setStage('voting')
            } else {
                alert(`Error: ${res.error}`)
            }
        } catch (err: any) {
            console.error(err)
            alert("Failed to start voting: " + err.message)
        } finally {
            setGeneratingAreas(false)
        }
    }

    const handleConfirmPub = async (pubId: string) => {
        try {
            await confirmPubWinner(roundId, pubId)
            setWinningPubId(pubId)
            setStage('results')
        } catch (e) {
            console.error(e)
            alert("Failed to confirm winner")
        }
    }

    if (loading) return null

    // Manual refresh helper
    const refreshMembers = async () => {
        const { data: memData } = await supabase.from('party_members').select('*').eq('round_id', roundId)
        if (memData) setMembers(memData)
    }

    const uniqueMembers = Array.from(new Map(members.map(m => [m.id, m])).values())

    // Used for preventing double clicks
    const componentStatus = roundStatus;

    return (
        <div className="w-full flex flex-col items-center">
            {/* Persistent Header */}
            <div className="fixed top-0 left-0 right-0 bg-charcoal/90 backdrop-blur-md p-3 z-50 border-b border-white/10 flex justify-between items-center px-4 shadow-lg h-16">
                {/* Left: Code */}
                <div className="flex flex-col">
                    <span className="text-[10px] text-white/50 uppercase tracking-wider">Round Code</span>
                    <span className="text-pint-gold font-mono text-xl font-bold leading-none">{code}</span>
                </div>

                {/* Center: Stage Runner (Read Only Review) */}
                <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-1">
                    {[
                        { id: 'lobby', label: 'Lobby' },
                        { id: 'voting', label: 'Area' },
                        { id: 'pub_voting', label: 'Pubs' },
                        { id: 'results', label: 'Result' }
                    ].map((s, idx) => {
                        // Logic: 
                        // Active = Current Real Stage
                        // Viewing = If viewingStage is set
                        // Clickable = If stage is past/current

                        const isCurrentReal = stage === s.id
                        const isViewing = viewingStage === s.id || (!viewingStage && isCurrentReal)

                        // We can only view past stages or current
                        const stages = ['lobby', 'voting', 'pub_voting', 'results']
                        const currentIdx = stages.indexOf(stage)
                        const thisIdx = stages.indexOf(s.id)
                        const isPast = thisIdx <= currentIdx

                        return (
                            <button
                                key={s.id}
                                disabled={!isPast}
                                onClick={() => isPast && setViewingStage(s.id as any)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-bold uppercase tracking-wider",
                                    isViewing
                                        ? "bg-pint-gold text-charcoal border-pint-gold shadow-[0_0_15px_rgba(255,215,0,0.4)]"
                                        : isPast
                                            ? "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"
                                            : "opacity-30 border-transparent cursor-not-allowed"
                                )}
                            >
                                {s.label}
                            </button>
                        )
                    })}
                </div>

                {/* Center: Map Toggle (Context Aware) */}
                <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center">
                    <button
                        onClick={() => setMapState({
                            isOpen: true,
                            mode: stage === 'voting' ? 'voting' : stage === 'lobby' ? 'lobby' : 'results'
                        })}
                        className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full hover:bg-white/10 hover:border-pint-gold/50 transition-all active:scale-95 group"
                    >
                        <Users className="w-4 h-4 text-pint-gold group-hover:drop-shadow-[0_0_8px_rgba(255,215,0,0.5)] transition-all" />
                        <span className="text-sm font-bold text-white">{uniqueMembers.length}</span>
                        <span className="text-[10px] text-white/40 uppercase tracking-wider ml-1 group-hover:text-white/60">Map</span>
                    </button>
                </div>

                {/* Right: Host Controls & Exit */}
                {/* Right: Host Controls & Exit */}
                <div className="flex items-center gap-2">
                    {/* Pin / Settings Button (Destructive Reset) */}
                    {joined && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-white/60 hover:text-pint-gold p-2 transition-colors active:scale-95"
                                >
                                    <MapPin className="w-5 h-5" />
                                    <span className="sr-only">Location Settings</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-charcoal border-white/10 text-white max-w-sm">
                                <DialogHeader>
                                    <DialogTitle>Change Location?</DialogTitle>
                                    <DialogDescription className="text-white/60">
                                        Warning: Changing your location will <span className="text-red-400 font-bold">RESET</span> the round to the Lobby for everyone.
                                        <br /><br />
                                        Are you sure you want to proceed?
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <Button variant="ghost" className="text-white/40 hover:text-white" onClick={() => { /* Close logic via trigger usually */ }}>Cancel</Button>
                                    <Button
                                        variant="destructive"
                                        className="bg-red-500/20 text-red-400 hover:bg-red-500/40 border border-red-500/50"
                                        onClick={() => {
                                            setIsEditingSettings(true)
                                            // Close dialog handled by parent re-render or explicit state if controlled
                                        }}
                                    >
                                        Yes, Reset Round
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}

                    {/* Host Back Button */}
                    {isHost && stage !== 'lobby' && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={async () => {
                                if (confirm("Go back to previous stage? This might reset some progress.")) {
                                    // @ts-ignore
                                    await regressStage(roundId, stage)
                                }
                            }}
                            className="text-xs h-8 bg-pint-gold/10 text-pint-gold border border-pint-gold/30 hover:bg-pint-gold/20"
                        >
                            ← Go Back
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleExit}
                        className="text-white/60 hover:text-red-400 hover:bg-red-900/20 p-2"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="sr-only">Exit</span>
                    </Button>
                </div>
            </div>

            {/* Stage Runner (Sub-header) */}
            <div className="fixed top-16 left-0 right-0 h-12 bg-charcoal/80 backdrop-blur-md border-b border-white/5 z-40 flex justify-center items-center gap-2">
                {[
                    { id: 'lobby', label: 'Lobby' },
                    { id: 'voting', label: 'Area' },
                    { id: 'pub_voting', label: 'Pubs' },
                    { id: 'results', label: 'Result' }
                ].map((s, idx) => {
                    const stages = ['lobby', 'voting', 'pub_voting', 'results']
                    const currentIdx = stages.indexOf(stage)
                    const thisIdx = stages.indexOf(s.id)
                    const isPast = thisIdx <= currentIdx

                    // Active = The one we are VIEWING
                    const isActive = viewingStage ? viewingStage === s.id : stage === s.id

                    return (
                        <button
                            key={s.id}
                            disabled={!isPast}
                            onClick={() => isPast && setViewingStage(s.id as any)}
                            className={cn(
                                "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                                isActive
                                    ? "bg-white text-charcoal shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                                    : isPast
                                        ? "text-white/40 hover:text-white"
                                        : "text-white/10 cursor-not-allowed"
                            )}
                        >
                            {s.label}
                        </button>
                    )
                })}
            </div>

            {/* Member Map Modal (Context Aware) */}
            <MemberMapModal
                isOpen={mapState.isOpen}
                onClose={() => setMapState(prev => ({ ...prev, isOpen: false }))}
                members={uniqueMembers}
                stationData={stationData}
                mode={mapState.mode}
                focusedMemberId={mapState.focusedMemberId}
                candidateStations={areaOptions} // Pass available options
                winningStation={winningPubId ? undefined : undefined} // TODO: Derive winning station if needed, or rely on Pubs
            />

            {/* System Message Toast */}
            {systemMessage && (
                <div className="fixed top-32 left-1/2 transform -translate-x-1/2 z-[60] bg-pint-gold text-charcoal px-4 py-2 rounded-full shadow-lg font-bold text-sm animate-in fade-in slide-in-from-top-4">
                    📢 {systemMessage}
                </div>
            )}

            <div className="mt-32 w-full max-w-md p-4 space-y-8 animate-fade-in-up flex flex-col items-center pb-20">

                {/* 0. EDIT SETTINGS VIEW */}
                {isEditingSettings ? (
                    <div className="w-full flex flex-col items-center">
                        <JoinRoundForm
                            roundId={roundId}
                            onJoin={() => { setIsEditingSettings(false); refreshMembers(); }}
                            initialData={members.find(m => m.id === myMemberId)}
                            isUpdate={true}
                        />
                        <Button variant="ghost" className="text-white/40 mt-4" onClick={() => setIsEditingSettings(false)}>Cancel</Button>
                    </div>
                ) : (
                    <>
                        {/* RENDER BASED ON VIEWING STAGE (Review Mode) OR CURRENT STAGE */}
                        {(() => {
                            const effectiveStage = viewingStage || stage
                            const isReview = !!viewingStage && viewingStage !== stage

                            if (effectiveStage === 'results') {
                                return recommendations ? (
                                    <ResultsView
                                        recommendations={winningPubId
                                            ? recommendations.filter(r => r.place_id === winningPubId)
                                            : recommendations}
                                    />
                                ) : <p className="text-white">Loading Results...</p>
                            }

                            if (!joined) {
                                return (
                                    <JoinRoundForm
                                        roundId={roundId}
                                        onJoin={() => window.location.reload()}
                                        existingMembers={uniqueMembers}
                                    />
                                )
                            }

                            if (effectiveStage === 'pub_voting' && recommendations) {
                                return (
                                    <PubVotingView
                                        pubs={recommendations}
                                        // @ts-ignore
                                        round={{ id: roundId }}
                                        currentUserId={myUserId || ''}
                                        onVote={() => { if (!isReview) { } }} // Disable in review
                                        onConfirmWinner={async (pid) => { if (!isReview) handleConfirmPub(pid) }}
                                        isHost={isHost}
                                        readOnly={isReview}
                                    />
                                )
                            }

                            if (effectiveStage === 'voting') {
                                return (
                                    <div className="relative w-full">
                                        <AreaVotingView
                                            roundId={roundId}
                                            options={areaOptions}
                                            members={uniqueMembers}
                                            currentUserMemberId={myMemberId || undefined}
                                            isHost={isHost}
                                            aiStrategy={aiStrategy || undefined} // Pass AI Strategy
                                            onVote={async (areaId) => { if (myMemberId && !isReview) console.log("Vote cast", areaId) }}
                                            onStageChange={async (newStage) => {
                                                if (!isReview) setStage(newStage as any)
                                            }}
                                        />
                                        {isReview && <div className="absolute inset-0 bg-transparent z-10 pointer-events-none" />}
                                    </div>
                                )
                            }

                            // Lobby
                            return (
                                <div className="w-full text-center space-y-8">
                                    <div>
                                        <h1 className="text-3xl font-bold text-white">Lobby</h1>
                                        <p className="text-white/60">Waiting for everyone...</p>
                                    </div>

                                    <div className="glass-panel p-6 rounded-2xl flex flex-col items-center gap-6 w-full">
                                        <div className="flex flex-col gap-3 w-full">
                                            {uniqueMembers.map((member) => {
                                                // Resolve Start Text (Lobby Version)
                                                let startText = 'Location Pending'
                                                if (member.start_location_type === 'station') {
                                                    startText = stationData[member.start_station_id]?.name || 'Station'
                                                } else if (member.start_location_type === 'live' || member.start_location_type === 'custom') {
                                                    startText = member.location?.address || 'Pinned Location'
                                                    // Keep it short
                                                    if (startText.length > 25) startText = startText.split(',')[0] + '...'
                                                }

                                                // Resolve End (if different)
                                                let endText = null
                                                if (member.end_location_type === 'station') {
                                                    endText = stationData[member.end_station_id]?.name || 'Station'
                                                } else if (member.end_location_type === 'custom') {
                                                    endText = 'Custom Return'
                                                }

                                                return (
                                                    <div
                                                        key={member.id}
                                                        onClick={() => setMapState({ isOpen: true, mode: 'single', focusedMemberId: member.id })}
                                                        className="flex items-center gap-4 bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/5 hover:border-pint-gold/50 animate-pop-in cursor-pointer transition-all active:scale-95 group"
                                                    >
                                                        <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 relative bg-black/40 flex-shrink-0">
                                                            {member.photo_path ? (
                                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                                <img
                                                                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/temporary_selfies/${member.photo_path}`}
                                                                    alt={member.name}
                                                                    className="w-full h-full object-cover transform scale-x-[-1]"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-white/50 font-bold">
                                                                    {member.name[0]?.toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex-1 min-w-0 text-left">
                                                            <p className="text-white font-bold truncate">{member.name}</p>
                                                            <div className="flex flex-col text-xs text-white/60">
                                                                <span className="truncate">From: {startText}</span>
                                                                {endText && <span className="truncate">To: {endText}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                            {uniqueMembers.length === 0 && <p className="text-white/20 italic">No one yet...</p>}
                                        </div>

                                        <div className="w-full h-px bg-white/10" />

                                        <div className="flex flex-col gap-2">
                                            <p className="text-white text-lg font-medium">{uniqueMembers.length} {uniqueMembers.length === 1 ? 'Person' : 'People'} Ready</p>
                                            {isHost ? (
                                                <p className="text-sm text-pint-gold animate-pulse">You are the host.</p>
                                            ) : (
                                                <p className="text-sm text-white/40 max-w-xs">Waiting for host to start...</p>
                                            )}
                                        </div>

                                        {isHost ? (
                                            <Button
                                                variant="primary"
                                                size="lg"
                                                className="w-full mt-2 shadow-[0_0_20px_rgba(255,215,0,0.4)]"
                                                onClick={handleStartVoting}
                                                disabled={generatingAreas || uniqueMembers.length === 0}
                                            >
                                                {generatingAreas ? 'AI is Thinking...' : 'Calculate Options'}
                                            </Button>
                                        ) : (
                                            <div className="p-3 bg-white/5 rounded-lg w-full">
                                                <p className="text-white/50 text-sm">Host controls the round.</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-center gap-4">
                                        <Button variant="ghost" className="text-white/30 hover:text-white" onClick={refreshMembers}>
                                            ↻ Refresh
                                        </Button>
                                    </div>
                                </div>
                            )
                        })()}
                    </>
                )}
            </div>
        </div>
    )
}
