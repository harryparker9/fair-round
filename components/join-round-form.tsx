'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { SelfieCapture } from '@/components/selfie-capture'
import { supabase } from '@/lib/supabase'
import { identifyLocation, geocodeAddress } from '@/actions/location'
import { searchStations } from '@/actions/stations'
import { MapPin, Train, RefreshCw, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface JoinRoundFormProps {
    roundId: string // UUID from DB
    onJoin: () => void
}

export function JoinRoundForm({ roundId, onJoin }: JoinRoundFormProps) {
    const [name, setName] = useState('')
    const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
    const [status, setStatus] = useState<'idle' | 'locating' | 'uploading'>('idle')
    const [skipSelfie, setSkipSelfie] = useState(false)

    // Location State
    const [startMode, setStartMode] = useState<'live' | 'station' | 'custom'>('live')
    const [endMode, setEndMode] = useState<'same' | 'station' | 'custom'>('same')

    // Live Location Data
    const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null)
    const [locationName, setLocationName] = useState<string | null>(null)

    // Station Data
    const [stationQuery, setStationQuery] = useState('')
    const [stationResults, setStationResults] = useState<any[]>([])
    const [selectedStartStation, setSelectedStartStation] = useState<any | null>(null)

    // Custom Start Data
    const [customStartQuery, setCustomStartQuery] = useState('')
    const [selectedCustomStart, setSelectedCustomStart] = useState<{ lat: number, lng: number, address: string } | null>(null)

    // End Data
    const [selectedEndStation, setSelectedEndStation] = useState<any | null>(null)
    const [endStationQuery, setEndStationQuery] = useState('')
    const [endStationResults, setEndStationResults] = useState<any[]>([])

    // Custom End Data
    const [customEndQuery, setCustomEndQuery] = useState('')
    const [selectedCustomEnd, setSelectedCustomEnd] = useState<{ lat: number, lng: number, address: string } | null>(null)

    // Search Stations Effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (stationQuery.length >= 2) {
                const results = await searchStations(stationQuery)
                setStationResults(results || [])
            } else {
                setStationResults([])
            }
        }, 300)
        return () => clearTimeout(delayDebounceFn)
    }, [stationQuery])

    // End Station Search Effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (endStationQuery.length >= 2) {
                const results = await searchStations(endStationQuery)
                setEndStationResults(results || [])
            } else {
                setEndStationResults([])
            }
        }, 300)
        return () => clearTimeout(delayDebounceFn)
    }, [endStationQuery])


    const handleGeocodeStart = async () => {
        if (!customStartQuery) return
        setStatus('locating')
        const res = await geocodeAddress(customStartQuery)
        setStatus('idle')
        if (res.success && res.location) {
            setSelectedCustomStart({
                lat: res.location.lat,
                lng: res.location.lng,
                address: res.location.formatted_address
            })
        } else {
            alert("Address not found")
        }
    }

    const handleGeocodeEnd = async () => {
        if (!customEndQuery) return
        setStatus('locating')
        const res = await geocodeAddress(customEndQuery)
        setStatus('idle')
        if (res.success && res.location) {
            setSelectedCustomEnd({
                lat: res.location.lat,
                lng: res.location.lng,
                address: res.location.formatted_address
            })
        } else {
            alert("Address not found")
        }
    }

    const handleGetLocation = () => {
        setStatus('locating')
        if (!navigator.geolocation) {
            alert("Geolocation is not supported")
            setStatus('idle')
            return
        }
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude
                const lng = position.coords.longitude
                setLocation({ lat, lng })

                try {
                    const res = await identifyLocation(lat, lng)
                    if (res.success && res.station) {
                        setLocationName(`Near ${res.station.name}`)
                    } else {
                        setLocationName('Location Locked')
                    }
                } catch (e) {
                    setLocationName('Location Locked')
                }
                setStatus('idle')
            },
            () => { alert("Unable to retrieve location"); setStatus('idle') }
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name) return

        // Validate Location logic
        let finalLocation = null
        if (startMode === 'live') {
            if (!location) return
            finalLocation = location
        } else if (startMode === 'station') {
            if (!selectedStartStation) return
            finalLocation = { lat: 0, lng: 0, address: selectedStartStation.name } // Station ID handled separately
        } else if (startMode === 'custom') {
            if (!selectedCustomStart) return
            finalLocation = { lat: selectedCustomStart.lat, lng: selectedCustomStart.lng, address: selectedCustomStart.address }
        }

        // Validate End Location
        let finalEndLocation = null
        if (endMode === 'custom') {
            if (!selectedCustomEnd) return
            finalEndLocation = { lat: selectedCustomEnd.lat, lng: selectedCustomEnd.lng }
        }

        setStatus('uploading')
        try {
            let photoPath = null
            if (photoBlob) {
                const filename = `${roundId}/${Date.now()}.jpg`
                const { data } = await supabase.storage.from('temporary_selfies').upload(filename, photoBlob)
                if (data) photoPath = data.path
            }

            // Check existing
            const { data: existingMember } = await supabase
                .from('party_members')
                .select('*')
                .eq('round_id', roundId)
                .ilike('name', name.trim())
                .maybeSingle()

            let memberId = existingMember?.id

            if (!memberId) {
                const { data: newMember, error } = await supabase
                    .from('party_members')
                    .insert([{
                        round_id: roundId,
                        name: name.trim(),
                        photo_path: photoPath,
                        transport_mode: 'transit',
                        status: 'ready',
                        location: finalLocation,
                        start_location_type: startMode,
                        start_station_id: startMode === 'station' ? selectedStartStation.id : null,
                        end_location_type: endMode,
                        end_station_id: endMode === 'station' ? selectedEndStation?.id : null,
                        // @ts-ignore - Columns added via migration
                        end_lat: finalEndLocation?.lat,
                        // @ts-ignore
                        end_lng: finalEndLocation?.lng
                    }])
                    .select()
                    .single()

                if (error) throw error
                memberId = newMember.id
            }

            if (memberId) {
                localStorage.setItem(`fair-round-member-id-${roundId}`, memberId)
                localStorage.setItem(`fair-round-joined-${roundId}`, 'true')
            }
            onJoin()
        } catch (err) {
            console.error(err)
            alert('Failed to join')
        } finally {
            setStatus('idle')
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6 w-full max-w-sm animate-fade-in-up delay-100 pb-20">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white">Join the Party</h2>
                <p className="text-white/60 text-sm">Tell us where you're starting from.</p>
            </div>

            <div className="w-full space-y-6">
                {/* 1. Name & Selfie */}
                <div className="space-y-4">
                    {!skipSelfie ? (
                        <div className="flex flex-col items-center gap-2">
                            <SelfieCapture onCapture={setPhotoBlob} disabled={status !== 'idle'} />
                            <button type="button" onClick={() => setSkipSelfie(true)} className="text-xs text-white/40 hover:text-white underline">Skip Photo</button>
                        </div>
                    ) : (
                        <div className="w-full h-16 flex items-center justify-center border border-dashed border-white/20 rounded-xl bg-white/5 cursor-pointer" onClick={() => setSkipSelfie(false)}>
                            <span className="text-sm text-white/40">Add Photo +</span>
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
                </div>

                <div className="h-px bg-white/10 w-full" />

                {/* 2. Start Location */}
                <div className="space-y-3">
                    <label className="text-xs uppercase tracking-widest text-white/50 font-bold block text-center">Start Location</label>
                    <div className="flex bg-white/5 p-1 rounded-lg">
                        <button type="button" onClick={() => setStartMode('live')} className={cn("flex-1 py-2 text-xs rounded-md transition-all flex items-center justify-center gap-1", startMode === 'live' ? "bg-fairness-green text-charcoal font-bold shadow-lg" : "text-white/60 hover:text-white")}>
                            <MapPin className="w-3 h-3" /> Live
                        </button>
                        <button type="button" onClick={() => setStartMode('station')} className={cn("flex-1 py-2 text-xs rounded-md transition-all flex items-center justify-center gap-1", startMode === 'station' ? "bg-pint-gold text-charcoal font-bold shadow-lg" : "text-white/60 hover:text-white")}>
                            <Train className="w-3 h-3" /> Station
                        </button>
                        <button type="button" onClick={() => setStartMode('custom')} className={cn("flex-1 py-2 text-xs rounded-md transition-all flex items-center justify-center gap-1", startMode === 'custom' ? "bg-white text-charcoal font-bold shadow-lg" : "text-white/60 hover:text-white")}>
                            <MapPin className="w-3 h-3" /> Address
                        </button>
                    </div>

                    {startMode === 'live' && (
                        !location ? (
                            <Button type="button" onClick={handleGetLocation} variant="secondary" className="w-full" disabled={status === 'locating'}>
                                {status === 'locating' ? 'Locating...' : '📍 Share Current Location'}
                            </Button>
                        ) : (
                            <div className="bg-white/10 p-3 rounded-lg flex justify-between items-center border border-fairness-green/30">
                                <span className="text-fairness-green text-sm font-medium">📍 {locationName || 'Location Locked'}</span>
                                <button type="button" onClick={() => { setLocation(null); setLocationName(null); }} className="text-white/40 hover:text-white p-1"><RefreshCw className="w-4 h-4" /></button>
                            </div>
                        )
                    )}

                    {startMode === 'station' && (
                        <div className="relative">
                            {!selectedStartStation ? (
                                <input
                                    type="text"
                                    placeholder="Search Station..."
                                    value={stationQuery}
                                    onChange={(e) => setStationQuery(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pint-gold"
                                    autoFocus
                                />
                            ) : (
                                <div className="bg-pint-gold/20 border border-pint-gold/50 p-3 rounded-xl flex justify-between items-center">
                                    <div className="text-left">
                                        <p className="text-pint-gold font-bold text-sm">{selectedStartStation.name}</p>
                                        <p className="text-white/40 text-xs">{selectedStartStation.lines?.[0]}</p>
                                    </div>
                                    <button type="button" onClick={() => { setSelectedStartStation(null); setStationQuery(''); }} className="text-white/60 hover:text-white">✕</button>
                                </div>
                            )}

                            {/* Dropdown */}
                            {stationResults.length > 0 && !selectedStartStation && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-charcoal border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-50">
                                    {stationResults.map(s => (
                                        <div key={s.id} onClick={() => { setSelectedStartStation(s); setStationResults([]); }} className="p-3 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-0 text-left">
                                            <p className="text-white text-sm font-medium">{s.name}</p>
                                            <p className="text-white/40 text-xs">Zone {s.zone} • {s.lines?.[0]}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {startMode === 'custom' && (
                        <div className="relative space-y-2">
                            {!selectedCustomStart ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Postcode or Address..."
                                        value={customStartQuery}
                                        onChange={(e) => setCustomStartQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleGeocodeStart())}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pint-gold"
                                        autoFocus
                                    />
                                    <Button type="button" onClick={handleGeocodeStart} disabled={!customStartQuery || status === 'locating'} variant="secondary">
                                        Search
                                    </Button>
                                </div>
                            ) : (
                                <div className="bg-white/10 border border-white/20 p-3 rounded-xl flex justify-between items-center">
                                    <div className="text-left">
                                        <p className="text-white font-bold text-sm truncate max-w-[200px]">{selectedCustomStart.address}</p>
                                        <p className="text-white/40 text-xs">Custom Start</p>
                                    </div>
                                    <button type="button" onClick={() => { setSelectedCustomStart(null); setCustomStartQuery(''); }} className="text-white/60 hover:text-white">✕</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 3. End Location */}
                <div className="space-y-3 pt-2">
                    <label className="text-xs uppercase tracking-widest text-white/50 font-bold block text-center">End Location</label>
                    <div className="flex bg-white/5 p-1 rounded-lg">
                        <button type="button" onClick={() => setEndMode('same')} className={cn("flex-1 py-2 text-xs rounded-md transition-all flex items-center justify-center gap-1", endMode === 'same' ? "bg-white/20 text-white font-bold" : "text-white/40 hover:text-white")}>
                            <RefreshCw className="w-3 h-3" /> Same
                        </button>
                        <button type="button" onClick={() => setEndMode('station')} className={cn("flex-1 py-2 text-xs rounded-md transition-all flex items-center justify-center gap-1", endMode === 'station' ? "bg-white/20 text-white font-bold" : "text-white/40 hover:text-white")}>
                            <Train className="w-3 h-3" /> Station
                        </button>
                        <button type="button" onClick={() => setEndMode('custom')} className={cn("flex-1 py-2 text-xs rounded-md transition-all flex items-center justify-center gap-1", endMode === 'custom' ? "bg-white/20 text-white font-bold" : "text-white/40 hover:text-white")}>
                            <MapPin className="w-3 h-3" /> Address
                        </button>
                    </div>

                    {endMode === 'station' && (
                        <div className="relative">
                            {!selectedEndStation ? (
                                <input
                                    type="text"
                                    placeholder="Search Home Station..."
                                    value={endStationQuery}
                                    onChange={(e) => setEndStationQuery(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pint-gold"
                                    autoFocus
                                />
                            ) : (
                                <div className="bg-white/10 border border-white/20 p-3 rounded-xl flex justify-between items-center">
                                    <div className="text-left">
                                        <p className="text-white font-bold text-sm">{selectedEndStation.name}</p>
                                        <p className="text-white/40 text-xs">Home Base</p>
                                    </div>
                                    <button type="button" onClick={() => { setSelectedEndStation(null); setEndStationQuery(''); }} className="text-white/60 hover:text-white">✕</button>
                                </div>
                            )}

                            {endStationResults.length > 0 && !selectedEndStation && (
                                <div className="absolute bottom-full mb-2 left-0 right-0 bg-charcoal border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-50">
                                    {endStationResults.map(s => (
                                        <div key={s.id} onClick={() => { setSelectedEndStation(s); setEndStationResults([]); }} className="p-3 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-0 text-left">
                                            <p className="text-white text-sm font-medium">{s.name}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {endMode === 'custom' && (
                        <div className="relative space-y-2">
                            {!selectedCustomEnd ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Return Address..."
                                        value={customEndQuery}
                                        onChange={(e) => setCustomEndQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleGeocodeEnd())}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pint-gold"
                                        autoFocus
                                    />
                                    <Button type="button" onClick={handleGeocodeEnd} disabled={!customEndQuery || status === 'locating'} variant="secondary">
                                        Search
                                    </Button>
                                </div>
                            ) : (
                                <div className="bg-white/10 border border-white/20 p-3 rounded-xl flex justify-between items-center">
                                    <div className="text-left">
                                        <p className="text-white font-bold text-sm truncate max-w-[200px]">{selectedCustomEnd.address}</p>
                                        <p className="text-white/40 text-xs">Custom Return</p>
                                    </div>
                                    <button type="button" onClick={() => { setSelectedCustomEnd(null); setCustomEndQuery(''); }} className="text-white/60 hover:text-white">✕</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <Button
                    type="submit"
                    variant="primary"
                    className="w-full shadow-lg mt-4"
                    disabled={!name || (startMode === 'live' && !location) || (startMode === 'station' && !selectedStartStation) || status !== 'idle'}
                >
                    {status === 'uploading' ? 'Joining...' : 'Ready to Start'}
                </Button>
            </div>
        </form>
    )
}
