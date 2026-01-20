'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

function generateCode() {
    // Generate random 6 character code (A-Z, 0-9)
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return result
}

export function CreateRoundCard() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleCreateRound = async () => {
        setLoading(true)
        const code = generateCode()

        // In a real app, check collision. For MVP, assume unique.
        const { data, error } = await supabase
            .from('rounds')
            .insert([
                {
                    code,
                    status: 'active',
                    settings: { mode: 'optimized' }
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

    return (
        <Card className="max-w-md w-full text-center space-y-6 animate-fade-in-up">
            <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-white">Start a Round</h2>
                <p className="text-white/60">Find the fairest pub for your group in London.</p>
            </div>

            <div className="flex flex-col gap-4">
                <Button
                    variant="primary"
                    size="lg"
                    onClick={handleCreateRound}
                    disabled={loading}
                    className="w-full text-lg shadow-[0_0_20px_rgba(255,215,0,0.4)]"
                >
                    {loading ? 'Initiating...' : 'Create New Round'}
                </Button>
                <p className="text-xs text-white/40">Powered by Gemini AI • 2026 Edition</p>
            </div>
        </Card>
    )
}
