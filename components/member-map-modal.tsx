'use client'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { PartyMember, AreaOption } from '@/types'
import { X, User } from 'lucide-react'

interface MemberMapModalProps {
    members: PartyMember[]
    isOpen: boolean
    onClose: () => void
    stationData: Record<string, { name: string, lat: number, lng: number }>
    mode: 'lobby' | 'voting' | 'results' | 'single'
    focusedMemberId?: string
    candidateStations?: AreaOption[]
    winningStation?: AreaOption
}

export function MemberMapModal({ members, isOpen, onClose, stationData, mode, focusedMemberId, candidateStations, winningStation }: MemberMapModalProps) {
    // Helper to resolve coordinates
    const getCoords = (member: PartyMember, type: 'start' | 'end'): { lat: number, lng: number } | null => {
        if (type === 'start') {
            if (member.start_location_type === 'station' && member.start_station_id) return stationData[member.start_station_id] || null
            if ((member.start_location_type === 'live' || member.start_location_type === 'custom') && member.location) return member.location
        } else {
            if (member.end_location_type === 'station' && member.end_station_id) return stationData[member.end_station_id] || null
            if (member.end_location_type === 'custom' && member.end_lat && member.end_lng) return { lat: member.end_lat, lng: member.end_lng }
            if (member.end_location_type === 'same' && member.location) return member.location // Default to start
        }
        return null
    }

    // Determine Center
    // If focused member, center on them. Else center on London or centroid.
    const activeMembers = members.filter(m => m.status === 'ready' && m.location)

    let defaultCenter = { lat: 51.5074, lng: -0.1278 }

    if (focusedMemberId) {
        const m = members.find(m => m.id === focusedMemberId)
        if (m) {
            const c = getCoords(m, 'start')
            if (c) defaultCenter = c
        }
    } else if (activeMembers.length > 0) {
        // Simple Centroid
        const sum = activeMembers.reduce((acc, m) => {
            const c = getCoords(m, 'start')
            return c ? { lat: acc.lat + c.lat, lng: acc.lng + c.lng } : acc
        }, { lat: 0, lng: 0 })
        defaultCenter = { lat: sum.lat / activeMembers.length, lng: sum.lng / activeMembers.length }
    }

    // Prepare Title/Header
    const getTitle = () => {
        if (mode === 'single' && focusedMemberId) {
            return `${members.find(m => m.id === focusedMemberId)?.name || 'Member'}'s Journey`
        }
        if (mode === 'voting') return "Triangulation Candidates"
        if (mode === 'results') return "The Final Decision"
        return "Party Locations"
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="bg-charcoal border-white/10 text-white p-0 overflow-hidden max-w-3xl w-full h-[70vh] sm:h-[600px] sm:rounded-2xl">
                <div className="absolute top-4 right-4 z-50">
                    <button
                        onClick={onClose}
                        className="p-2 bg-black/50 text-white hover:bg-black/70 rounded-full backdrop-blur-md transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="absolute top-4 left-4 z-50 pointer-events-none">
                    <div className="bg-charcoal/90 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-xl pointer-events-auto">
                        <h3 className="font-bold text-white text-sm">{getTitle()}</h3>
                        <div className="text-[10px] text-white/50 mt-1">
                            {mode === 'lobby' && "Where everyone is starting from."}
                            {mode === 'voting' && "Proposed meeting points relative to group."}
                            {mode === 'results' && "The chosen winner."}
                        </div>
                    </div>
                </div>

                <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
                    <Map
                        defaultCenter={defaultCenter}
                        defaultZoom={11}
                        mapId="bf51a910020fa25a"
                        disableDefaultUI={true}
                        className="w-full h-full"
                    >
                        {/* 1. RENDER MEMBERS */}
                        {activeMembers.map(member => {
                            const start = getCoords(member, 'start')
                            const isFocused = member.id === focusedMemberId

                            if (!start) return null

                            // If in Voting/Results mode, usually just show Start? Or Start+End?
                            // Let's show Start for clarity to avoid clutter, unless single view.
                            return (
                                <AdvancedMarker key={member.id} position={start} zIndex={isFocused ? 50 : 10}>
                                    <div className="flex flex-col items-center group">
                                        <div className={`
                                            bg-white text-charcoal text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 shadow-md 
                                            transition-all group-hover:scale-110 whitespace-nowrap
                                            ${isFocused ? 'bg-pint-gold scale-110' : 'opacity-80 group-hover:opacity-100'}
                                        `}>
                                            {member.name}
                                        </div>
                                        {/* Avatar Pin */}
                                        <div className={`
                                            w-8 h-8 rounded-full border-2 overflow-hidden shadow-lg relative bg-gray-800
                                            ${isFocused ? 'border-pint-gold w-10 h-10' : 'border-white'}
                                        `}>
                                            {/* Fallback Icon */}
                                            <div className="absolute inset-0 flex items-center justify-center text-white/50">
                                                <User className="w-4 h-4" />
                                            </div>
                                            {/* Image */}
                                            {member.photo_path && (
                                                <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/temporary_selfies/${member.photo_path}`} className="w-full h-full object-cover relative z-10 transform scale-x-[-1]" />
                                            )}
                                        </div>
                                    </div>
                                </AdvancedMarker>
                            )
                        })}

                        {/* 2. RENDER STATIONS (Voting Mode) */}
                        {mode === 'voting' && candidateStations && candidateStations.map((station, idx) => (
                            <AdvancedMarker key={station.id} position={station.center} zIndex={40}>
                                <div className="flex flex-col items-center group cursor-pointer">
                                    <div className="bg-charcoal text-pint-gold border border-pint-gold text-[10px] font-bold px-2 py-1 rounded mb-1 shadow-xl">
                                        #{idx + 1} {station.name}
                                    </div>
                                    <Pin background={'#FFD700'} borderColor={'#000'} glyphColor={'#000'} scale={1.2} />
                                </div>
                            </AdvancedMarker>
                        ))}

                        {/* 3. RENDER WINNER (Results Mode) */}
                        {mode === 'results' && winningStation && (
                            <AdvancedMarker position={winningStation.center} zIndex={100}>
                                <div className="flex flex-col items-center animate-bounce">
                                    <div className="bg-pint-gold text-charcoal text-xs font-bold px-3 py-1 rounded shadow-xl mb-1 border-2 border-white">
                                        👑 {winningStation.name}
                                    </div>
                                    <Pin background={'#FFD700'} borderColor={'#FFFFFF'} glyphColor={'#000'} scale={1.4} />
                                </div>
                            </AdvancedMarker>
                        )}

                    </Map>
                </APIProvider>
            </DialogContent>
        </Dialog>
    )
}
