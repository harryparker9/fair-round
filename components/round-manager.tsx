'use client'

import { useState, useEffect } from 'react'
import { JoinRoundForm } from '@/components/join-round-form'
import { Button } from '@/components/ui/button'
import { ResultsView } from '@/components/results-view'
import { PubRecommendation, AreaOption } from '@/types'
import { supabase } from '@/lib/supabase'
import { startAreaVoting } from '@/actions/voting'
import { AreaVotingView } from '@/components/area-voting-view'
import { cn } from '@/lib/utils'

interface RoundManagerProps {
    roundId: string
    code: string
}

export function RoundManager({ roundId, code }: RoundManagerProps) {
    const [joined, setJoined] = useState(false)
    const [loading, setLoading] = useState(true)
    const [recommendations, setRecommendations] = useState<PubRecommendation[] | null>(null)

    // Status States
    const [triangulating, setTriangulating] = useState(false)
    const [generatingAreas, setGeneratingAreas] = useState(false)

    // Data States
    const [stage, setStage] = useState<'lobby' | 'voting' | 'results'>('lobby')
    const [areaOptions, setAreaOptions] = useState<AreaOption[]>([])
    const [members, setMembers] = useState<any[]>([])

    // User Identity
    const [myMemberId, setMyMemberId] = useState<string | null>(null)

    useEffect(() => {
        // 1. Check local storage
        const storedJoined = localStorage.getItem(`fair-round-joined-${roundId}`)
        const storedMemberId = localStorage.getItem(`fair-round-member-id-${roundId}`)

        if (storedJoined) setJoined(true)
        if (storedMemberId) setMyMemberId(storedMemberId)

        setLoading(false)

        // 2. Fetch initial Data (Round + Members)
        const initData = async () => {
            const { data: roundData } = await supabase.from('rounds').select('*').eq('id', roundId).single()
            if (roundData) {
                setStage(roundData.stage)
                setAreaOptions(roundData.area_options || [])

                // If results already exist in cache and we are in results stage, fetch them
                if (roundData.stage === 'results') {
                    const { data: cache } = await supabase.from('pub_cache').select('results').eq('round_id', roundId).single()
                    if (cache) setRecommendations(cache.results)
                }
            }

            const { data: memData } = await supabase.from('party_members').select('*').eq('round_id', roundId)
            if (memData) setMembers(memData)
        }
        initData()

        // 3. Subscribe to Realtime (Members AND Round)
        const channel = supabase
            .channel(`round_lobby_${roundId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'party_members', filter: `round_id=eq.${roundId}` },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setMembers(prev => [...prev, payload.new])
                    } else if (payload.eventType === 'UPDATE') {
                        setMembers(prev => prev.map(m => m.id === payload.new.id ? payload.new : m))
                    }
                })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rounds', filter: `id=eq.${roundId}` },
                (payload) => {
                    const newRound = payload.new
                    setStage(newRound.stage)
                    if (newRound.area_options) setAreaOptions(newRound.area_options)

                    // If moved to results, fetch recommendations
                    if (newRound.stage === 'results') {
                        // small delay to ensure cache is hot
                        setTimeout(async () => {
                            const { data: cache } = await supabase.from('pub_cache').select('results').eq('round_id', roundId).single()
                            if (cache) setRecommendations(cache.results)
                        }, 1500)
                    }
                })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [roundId]) // Remove stage dependency to prevent infinite re-subs

    const handleJoin = (memberId: string) => {
        setJoined(true)
        setMyMemberId(memberId)
        // Storage is handled in JoinForm, but let's redundant save here if needed strictly
    }

    // HOST ONLY: Start Voting
    const handleStartVoting = async () => {
        setGeneratingAreas(true)
        try {
            // @ts-ignore
            const res = await startAreaVoting(roundId)

            if (res.success) {
                // Force local update immediately (don't wait for Realtime)
                setAreaOptions(res.options)
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

    if (loading) return null

    // De-duplicate members for display
    const uniqueMembers = Array.from(new Map(members.map(m => [m.id, m])).values())

    if (stage === 'results' && recommendations && recommendations.length > 0) {
        return <ResultsView recommendations={recommendations} />
    }

    if (!joined) {
        return (
            <div className="w-full max-w-md p-4 flex flex-col items-center">
                <div className="mb-8 text-center animate-pulse">
                    <span className="text-pint-gold text-sm font-mono tracking-widest uppercase">Round Code</span>
                    <h1 className="text-4xl font-bold text-white tracking-widest">{code}</h1>
                </div>
                {/* We pass a wrapper to handleJoin to trigger the state update */}
                <JoinRoundForm roundId={roundId} onJoin={() => window.location.reload()} />
            </div>
        )
    }

    // Manual refresh helper
    const refreshMembers = async () => {
        const { data: memData } = await supabase.from('party_members').select('*').eq('round_id', roundId)
        if (memData) setMembers(memData)
    }

    const handleOptimisticVote = (memberId: string, areaId: string) => {
        // Immediate local update
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, vote_area_id: areaId } : m))
        // Background fetch to ensure consistency
        refreshMembers()
    }

    if (stage === 'voting') {
        return (
            <div className="relative">
                <AreaVotingView
                    roundId={roundId}
                    options={areaOptions}
                    members={uniqueMembers}
                    currentUserMemberId={myMemberId || undefined}
                    isHost={true}
                    onVote={(areaId) => myMemberId && handleOptimisticVote(myMemberId, areaId)}
                    onStageChange={async (newStage) => {
                        setStage(newStage)
                        if (newStage === 'results') {
                            const { data: cache } = await supabase.from('pub_cache').select('results').eq('round_id', roundId).single()
                            if (cache) setRecommendations(cache.results)
                        }
                    }}
                />
                <Button
                    variant="ghost"
                    size="sm"
                    className="fixed bottom-4 right-4 text-white/20 hover:text-white z-50"
                    onClick={refreshMembers}
                >
                    ↻
                </Button>
            </div>
        )
    }

    // Lobby
    return (
        <div className="w-full max-w-md p-4 text-center space-y-8 animate-fade-in-up">
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
                    <p className="text-sm text-white/40 max-w-xs">Host, click below to find the best area.</p>
                </div>

                <Button
                    variant="primary"
                    size="lg"
                    className="w-full mt-2 shadow-[0_0_20px_rgba(255,215,0,0.4)]"
                    onClick={handleStartVoting}
                    disabled={generatingAreas || uniqueMembers.length === 0}
                >
                    {generatingAreas ? 'AI is Thinking...' : 'Calculate Options'}
                </Button>
            </div>

            <Button variant="ghost" className="text-white/30 hover:text-white" onClick={() => {
                localStorage.removeItem(`fair-round-joined-${roundId}`)
                localStorage.removeItem(`fair-round-member-id-${roundId}`)
                setJoined(false)
            }}>
                Leave Round
            </Button>
        </div>
    )
}
