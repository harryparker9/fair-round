'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

import { getRoundIdByCode } from '@/actions/round'

function generateCode() {
    // Generate random 6 character code (A-Z, 0-9)
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return result
}

interface CreateRoundCardProps {
    initialTab?: 'create' | 'join'
    onBack?: () => void
}

export function CreateRoundCard({ initialTab = 'create', onBack }: CreateRoundCardProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [joinLoading, setJoinLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<'create' | 'join'>(initialTab)
    const [joinCode, setJoinCode] = useState('')
    const [joinError, setJoinError] = useState<string | null>(null) // Error state

    const handleCreateRound = async (meetingTime?: string) => {
        setLoading(true)
        const code = generateCode()

        // Generate or get persistent user ID for Host Logic
        let userId = localStorage.getItem('fair_round_user_id')
        if (!userId) {
            userId = crypto.randomUUID()
            localStorage.setItem('fair_round_user_id', userId)
        }

        // In a real app, check collision. For MVP, assume unique.
        const { data, error } = await supabase
            .from('rounds')
            .insert([
                {
                    code,
                    host_id: userId, // Set the creator as host
                    status: 'active',
                    settings: {
                        mode: 'optimized',
                        meeting_time: meetingTime || new Date().toISOString()
                    }
                }
            ])
            .select()

        if (error) {
            console.error('Error creating round:', error)
            setLoading(false)
            // Fallback for demo/offline: just redirect
            if (process.env.NODE_ENV === 'development' && error.message.includes('fetch')) {
                console.warn('Supabase not connected. Proceeding in demo mode.')
                router.push(`/round/${code}`)
                return
            }
            alert('Failed to create round. Please check connection.')
            return
        }

        router.push(`/round/${code}`)
    }

    const handleJoinRound = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!joinCode || joinCode.length < 6) return

        setJoinLoading(true)
        setJoinError(null)

        try {
            const res = await getRoundIdByCode(joinCode)
            if (res.success && res.roundId) {
                // We redirect to the code (which currently acts as ID in route) or ID? 
                // The app usually routes /round/[id] or /round/[code]?
                // Let's check: The create flow pushes `/round/${code}`. 
                // But wait, the previous code pushed `/round/${joinCode}`.
                // If the route expects CODE, then we are good.
                // Validating existence is still good.
                router.push(`/round/${joinCode.toUpperCase()}`)
            } else {
                setJoinError(res.error || 'Invalid code')
            }
        } catch (err) {
            console.error("Join error", err)
            setJoinError("Failed to join")
        } finally {
            setJoinLoading(false)
        }
    }

    return (
        <Card className="max-w-md w-full text-center space-y-6 animate-fade-in-up p-6 relative">
            {onBack && (
                <button
                    onClick={onBack}
                    className="absolute top-4 left-4 text-white/40 hover:text-white transition-colors"
                >
                    ←
                </button>
            )}
            <div className="space-y-2 pt-2">
                <h2 className="text-3xl font-bold tracking-tight text-white">Start a Round</h2>
                <p className="text-white/60">Find the fairest pub for your group in London.</p>
            </div>

            {/* Tabs */}
            <div className="flex bg-white/5 p-1 rounded-xl">
                <button
                    onClick={() => setActiveTab('create')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'create' ? 'bg-pint-gold text-charcoal shadow-lg' : 'text-white/60 hover:text-white'}`}
                >
                    Create New
                </button>
                <button
                    onClick={() => setActiveTab('join')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'join' ? 'bg-pint-gold text-charcoal shadow-lg' : 'text-white/60 hover:text-white'}`}
                >
                    Join Existing
                </button>
            </div>

            <div className="flex flex-col gap-4 min-h-[120px] justify-center">
                {activeTab === 'create' ? (
                    <div className="space-y-4 animate-fade-in">
                        <p className="text-sm text-white/40">Start a fresh round and invite friends.</p>

                        {/* Meeting Time Picker */}
                        <div className="text-left space-y-1.5">
                            <label className="text-xs text-white/50 uppercase tracking-widest font-bold ml-1">Meeting Time</label>
                            <input
                                type="datetime-local"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-pint-gold transition-all"
                                defaultValue={new Date(new Date().setMinutes(new Date().getMinutes() - new Date().getTimezoneOffset())).toISOString().slice(0, 16)}
                                id="meeting-time"
                            />
                            <p className="text-[10px] text-white/30 ml-1">We'll check delays for this time.</p>
                        </div>

                        <Button
                            variant="primary"
                            size="lg"
                            onClick={() => {
                                const el = document.getElementById('meeting-time') as HTMLInputElement;
                                handleCreateRound(el?.value);
                            }}
                            disabled={loading}
                            className="w-full text-lg shadow-[0_0_20px_rgba(255,215,0,0.4)]"
                        >
                            {loading ? 'Initiating...' : 'Create New Round'}
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleJoinRound} className="space-y-4 animate-fade-in">
                        <p className="text-sm text-white/40">Enter the 6-character code from your host.</p>
                        <input
                            type="text"
                            placeholder="e.g. 2BCAYT"
                            maxLength={6}
                            value={joinCode}
                            onChange={(e) => {
                                setJoinCode(e.target.value.toUpperCase())
                                setJoinError(null)
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 text-center tracking-widest text-xl font-mono focus:outline-none focus:ring-2 focus:ring-pint-gold transition-all uppercase"
                        />
                        <Button
                            type="submit"
                            variant="secondary"
                            size="lg"
                            className="w-full"
                            disabled={joinCode.length < 6 || joinLoading}
                        >
                            {joinLoading ? 'Joining...' : 'Join Party'}
                        </Button>
                        {joinError && <p className="text-red-400 text-xs font-bold animate-shake">{joinError}</p>}
                    </form>
                )}

                <p className="text-xs text-white/40">Powered by Gemini AI • Harry Parker</p>
            </div>
        </Card>
    )
}
