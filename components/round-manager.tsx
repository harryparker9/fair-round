'use client'

import { useState, useEffect } from 'react'
import { JoinRoundForm } from '@/components/join-round-form'
import { Button } from '@/components/ui/button'
import { ResultsView } from '@/components/results-view'
import { PubRecommendation, AreaOption } from '@/types'
import { supabase } from '@/lib/supabase'
import { startAreaVoting, endRound, regressStage } from '@/actions/voting'
import { AreaVotingView } from '@/components/area-voting-view'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

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

    // Status States
    const [triangulating, setTriangulating] = useState(false)
    const [generatingAreas, setGeneratingAreas] = useState(false)

    // Data States
    const [stage, setStage] = useState<'lobby' | 'voting' | 'pub_voting' | 'results'>('lobby')
    const [roundStatus, setRoundStatus] = useState<string>('active')
    const [areaOptions, setAreaOptions] = useState<AreaOption[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [roundHostId, setRoundHostId] = useState<string | null>(null)
    const [winningPubId, setWinningPubId] = useState<string | null>(null)

    // User Identity
    const [myMemberId, setMyMemberId] = useState<string | null>(null)
    const [myUserId, setMyUserId] = useState<string | null>(null)

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

                if (roundData.stage === 'results' || roundData.stage === 'pub_voting') {
                    const { data: cache } = await supabase.from('pub_cache').select('results').eq('round_id', roundId).single()
                    if (cache) setRecommendations(cache.results)
                }
            }

            const { data: memData } = await supabase.from('party_members').select('*').eq('round_id', roundId)
            if (memData) setMembers(memData)
        }
        initData()
    }, [roundId])

    // 3. Realtime Subscription
    useEffect(() => {
        const channel = supabase
            .channel(`round_lobby_${roundId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'party_members', filter: `round_id=eq.${roundId}` },
                (payload) => {
                    console.log("Realtime Member Update:", payload)
                    if (payload.eventType === 'INSERT') {
                        setMembers(prev => [...prev, payload.new])
                    } else if (payload.eventType === 'UPDATE') {
                        setMembers(prev => prev.map(m => m.id === payload.new.id ? payload.new : m))
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

                {/* Center: Stage Name (Optional, but nice) */}
                <div className="absolute left-1/2 transform -translate-x-1/2">
                    {isHost && <span className="text-[10px] bg-pint-gold/20 text-pint-gold px-2 py-0.5 rounded font-bold border border-pint-gold/30">HOST</span>}
                </div>

                {/* Right: Host Controls & Exit */}
                <div className="flex items-center gap-2">
                    {isHost && stage !== 'lobby' && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={async () => {
                                if (confirm("Go back to previous stage? This might reset some progress.")) {
                                    // @ts-ignore
                                    await regressStage(roundId, stage)
                                    // Subscription will handle state update
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

            <div className="mt-20 w-full max-w-md p-4 space-y-8 animate-fade-in-up flex flex-col items-center pb-20">

                {/* 1. RESULTS VIEW */}
                {stage === 'results' ? (
                    recommendations ? (
                        <ResultsView
                            recommendations={winningPubId
                                ? recommendations.filter(r => r.place_id === winningPubId)
                                : recommendations}
                        />
                    ) : (
                        <p className="text-white">Loading Results...</p>
                    )
                ) :

                    /* 2. JOIN FORM */
                    !joined ? (
                        <JoinRoundForm
                            roundId={roundId}
                            onJoin={() => window.location.reload()}
                            existingMembers={uniqueMembers}
                        />
                    ) :

                        /* 3. PUB VOTING VIEW */
                        stage === 'pub_voting' && recommendations ? (
                            <PubVotingView
                                pubs={recommendations}
                                // @ts-ignore
                                round={{ id: roundId }}
                                currentUserId={myUserId || ''}
                                onVote={() => { }}
                                onConfirmWinner={handleConfirmPub}
                                isHost={isHost}
                            />
                        ) :

                            /* 4. AREA VOTING VIEW */
                            stage === 'voting' ? (
                                <div className="relative w-full">
                                    <AreaVotingView
                                        roundId={roundId}
                                        options={areaOptions}
                                        members={uniqueMembers}
                                        currentUserMemberId={myMemberId || undefined}
                                        isHost={isHost}
                                        onVote={(areaId) => myMemberId && console.log("Vote cast", areaId)} // Optimistic handled in View
                                        onStageChange={async (newStage) => {
                                            setStage(newStage as any)
                                        }}
                                    />
                                </div>
                            ) :

                                /* 5. LOBBY */
                                (
                                    <div className="w-full text-center space-y-8">
                                        <div>
                                            <h1 className="text-3xl font-bold text-white">Lobby</h1>
                                            <p className="text-white/60">Waiting for everyone...</p>
                                        </div>

                                        <div className="glass-panel p-6 rounded-2xl flex flex-col items-center gap-6">
                                            <div className="flex flex-wrap justify-center gap-4 min-h-[100px]">
                                                {uniqueMembers.map((member) => (
                                                    <div key={member.id} className="flex flex-col items-center gap-2 animate-pop-in">
                                                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-fairness-green relative bg-white/10 flex items-center justify-center">
                                                            {member.photo_path ? (
                                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                                <img
                                                                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/temporary_selfies/${member.photo_path}`}
                                                                    alt={member.name}
                                                                    className="w-full h-full object-cover transform scale-x-[-1]"
                                                                />
                                                            ) : (
                                                                <span className="text-xl font-bold text-white/50">{member.name.charAt(0).toUpperCase()}</span>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-white/80 font-medium">{member.name}</span>
                                                    </div>
                                                ))}
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
                                )}
            </div>
        </div>
    )
}
