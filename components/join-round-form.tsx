'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SelfieCapture } from '@/components/selfie-capture'
import { supabase } from '@/lib/supabase'
import { identifyLocation } from '@/actions/location'

interface JoinRoundFormProps {
    roundId: string // UUID from DB, not the 6-digit code
    onJoin: () => void
}

export function JoinRoundForm({ roundId, onJoin }: JoinRoundFormProps) {
    const [name, setName] = useState('')
    const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
    const [status, setStatus] = useState<'idle' | 'locating' | 'uploading'>('idle')
    const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null)
    const [locationName, setLocationName] = useState<string | null>(null)
    const [skipSelfie, setSkipSelfie] = useState(false)

    const handleGetLocation = () => {
        setStatus('locating')
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser")
            setStatus('idle')
            return
        }
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude
                const lng = position.coords.longitude

                setLocation({ lat, lng })

                // Fetch Context
                try {
                    const res = await identifyLocation(lat, lng)
                    if (res.success && res.station) {
                        setLocationName(`Near ${res.station.name}`)
                    } else {
                        setLocationName('Location Locked')
                    }
                } catch (e) {
                    console.error(e)
                    setLocationName('Location Locked')
                }

                setStatus('idle')
            },
            (error) => {
                console.error("Error getting location", error)
                alert("Unable to retrieve your location")
                setStatus('idle')
            }
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name || !location) return // Name and Location are strictly required

        setStatus('uploading')
        try {
            let photoPath = null

            // 1. Upload Selfie (Only if captured)
            if (photoBlob) {
                const filename = `${roundId}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`
                const { data: uploadData, error: uploadError } = await supabase
                    .storage
                    .from('temporary_selfies')
                    .upload(filename, photoBlob)

                if (uploadError) throw uploadError
                photoPath = uploadData.path
            }

            // 2. Check for existing member with same name (Resume Session)
            const { data: existingMember } = await supabase
                .from('party_members')
                .select('*')
                .eq('round_id', roundId)
                .ilike('name', name.trim())
                .maybeSingle()

            let memberId = existingMember?.id

            if (!memberId) {
                // 3. Create New Member if not exists
                const { data: newMember, error: insertError } = await supabase
                    .from('party_members')
                    .insert([
                        {
                            round_id: roundId,
                            name: name.trim(),
                            photo_path: photoPath,
                            transport_mode: 'transit',
                            status: 'ready',
                            location: { lat: location.lat, lng: location.lng, address: 'Current Location' }
                        }
                    ])
                    .select()
                    .single()

                if (insertError) throw insertError
                memberId = newMember.id
            } else {
                // Optional: Update location/photo for existing user? For now just resume.
                console.log("Resuming session for", name)
            }

            // Store ID for voting
            if (memberId) {
                localStorage.setItem(`fair-round-member-id-${roundId}`, memberId)
                localStorage.setItem(`fair-round-joined-${roundId}`, 'true')
            }

            // Success
            onJoin()
        } catch (err) {
            console.error('Error joining round:', err)
            alert('Failed to join. Please try again.')
        } finally {
            setStatus('idle')
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6 w-full max-w-sm animate-fade-in-up delay-100">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white">Join the Party</h2>
                <p className="text-white/60 text-sm">Snap a selfie (optional) and share location.</p>
            </div>

            <div className="w-full space-y-4">
                {/* Selfie Section */}
                {!skipSelfie ? (
                    <div className="flex flex-col items-center gap-2">
                        <SelfieCapture onCapture={setPhotoBlob} disabled={status !== 'idle'} />
                        <button
                            type="button"
                            onClick={() => setSkipSelfie(true)}
                            className="text-xs text-white/40 hover:text-white underline"
                        >
                            Skip Photo
                        </button>
                    </div>
                ) : (
                    <div className="w-64 h-64 bg-white/5 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2">
                        <span className="text-4xl">👤</span>
                        <p className="text-white/40 text-sm">No photo</p>
                        <button
                            type="button"
                            onClick={() => setSkipSelfie(false)}
                            className="text-xs text-pint-gold hover:underline mt-2"
                        >
                            Add Photo
                        </button>
                    </div>
                )}

                <input
                    type="text"
                    placeholder="Your Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 text-center focus:outline-none focus:ring-2 focus:ring-pint-gold transition-all"
                    required
                />

                {!location ? (
                    <Button
                        type="button"
                        onClick={handleGetLocation}
                        variant="secondary"
                        className="w-full"
                        disabled={status === 'locating'}
                    >
                        {status === 'locating' ? 'Locating...' : '📍 Share Current Location'}
                    </Button>
                ) : (
                    <div className="flex flex-col items-center gap-1">
                        <div className="text-center text-fairness-green text-sm flex items-center justify-center gap-2 font-medium">
                            <span>📍 {locationName || 'Location Locked'}</span>
                            <button type="button" onClick={() => { setLocation(null); setLocationName(null); }} className="text-white/40 hover:text-white text-xs underline">Change</button>
                        </div>
                        <p className="text-[10px] text-white/30">We'll find the best midpoint from here.</p>
                    </div>
                )}

                <Button
                    type="submit"
                    variant="primary"
                    className="w-full shadow-lg"
                    disabled={!name || !location || status !== 'idle'}
                >
                    {status === 'uploading' ? 'Joining...' : 'Ready to Start'}
                </Button>
            </div>
        </form>
    )
}
