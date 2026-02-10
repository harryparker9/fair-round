'use client'

import { useEffect, useRef } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps'
import { PartyMember, AreaOption } from '@/types'
import { X, User, MapPin as MapPinIcon } from 'lucide-react'

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

// Helper Component for Polylines
function MapPolyline({ path, options }: { path: google.maps.LatLngLiteral[], options: google.maps.PolylineOptions }) {
    const map = useMap()
    const polylineRef = useRef<google.maps.Polyline | null>(null)

    useEffect(() => {
        if (!map) return

        if (!polylineRef.current) {
            polylineRef.current = new google.maps.Polyline({
                ...options,
                path
            })
            polylineRef.current.setMap(map)
        } else {
            polylineRef.current.setOptions({ ...options, path })
        }

        return () => {
            if (polylineRef.current) {
                polylineRef.current.setMap(null)
            }
        }
    }, [map, path, options])

    return null
}

export function MemberMapModal({ members, isOpen, onClose, stationData, mode, focusedMemberId, candidateStations, winningStation }: MemberMapModalProps) {
    // Helper to resolve coordinates
    const getCoords = (member: PartyMember, type: 'start' | 'end'): { lat: number, lng: number } | null => {
        if (type === 'start') {
            if (member.start_location_type === 'station' && member.start_station_id) return stationData[member.start_station_id] || null
            if ((member.start_location_type === 'live' || member.start_location_type === 'custom') && member.location) {
                if (member.location.lat === 0 && member.location.lng === 0) return null
                return member.location
            }
        } else {
            if (member.end_location_type === 'station' && member.end_station_id) return stationData[member.end_station_id] || null
            if (member.end_location_type === 'custom' && member.end_lat && member.end_lng) {
                if (member.end_lat === 0 && member.end_lng === 0) return null
                return { lat: member.end_lat, lng: member.end_lng }
            }
            if (member.end_location_type === 'same' && member.location) {
                if (member.location.lat === 0 && member.location.lng === 0) return null
                return member.location // Default to start
            }
        }
        return null
    }

    // Determine Center
    const activeMembers = members.filter(m => m.status === 'ready')

    let defaultCenter = { lat: 51.5074, lng: -0.1278 }

    if (focusedMemberId) {
        const m = members.find(m => m.id === focusedMemberId)
        if (m) {
            const c = getCoords(m, 'start') || getCoords(m, 'end')
            if (c) defaultCenter = c
        }
    } else if (activeMembers.length > 0) {
        // Simple Centroid
        let count = 0
        const sum = activeMembers.reduce((acc, m) => {
            const s = getCoords(m, 'start')
            if (s) { acc.lat += s.lat; acc.lng += s.lng; count++; }
            return acc
        }, { lat: 0, lng: 0 })
        if (count > 0) defaultCenter = { lat: sum.lat / count, lng: sum.lng / count }
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

                {/* Legend */}
                {mode === 'lobby' || mode === 'single' ? (
                    <div className="absolute bottom-6 left-4 z-50 pointer-events-none">
                        <div className="bg-charcoal/90 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 shadow-xl pointer-events-auto text-[10px] space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-fairness-green"></span>
                                <span className="text-white">Start Location</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                                <span className="text-white">Return Location</span>
                            </div>
                        </div>
                    </div>
                ) : null}


                <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
                    <Map
                        defaultCenter={defaultCenter}
                        defaultZoom={11}
                        mapId="bf51a910020fa25a"
                        disableDefaultUI={true}
                        className="w-full h-full"
                        gestureHandling={'greedy'}
                    >
                        {/* 1. RENDER MEMBERS & JOURNEYS */}
                        {activeMembers.map(member => {
                            const start = getCoords(member, 'start')
                            const end = getCoords(member, 'end')
                            const isFocused = member.id === focusedMemberId

                            // IF FOCUS MODE: Only show focused member unless we are in lobby overview
                            if (mode === 'single' && !isFocused) return null

                            // Determine if we should draw line
                            const drawLine = start && end && (start.lat !== end.lat || start.lng !== end.lng)

                            const elements = []

                            if (start) {
                                elements.push(
                                    <AdvancedMarker key={`${member.id}-start`} position={start} zIndex={isFocused ? 60 : 20}>
                                        <div className="flex flex-col items-center group">
                                            <div className={`
                                                bg-fairness-green text-charcoal text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 shadow-md 
                                                transition-all whitespace-nowrap border border-charcoal/20
                                                ${isFocused ? 'scale-110' : 'opacity-80 group-hover:opacity-100 group-hover:scale-105'}
                                            `}>
                                                {member.name}
                                            </div>

                                            {/* Avatar Pin - GREEN BORDER */}
                                            <div className={`
                                                w-8 h-8 rounded-full overflow-hidden shadow-lg relative bg-charcoal
                                                border-2 border-fairness-green transition-transform
                                                ${isFocused ? 'scale-125 z-50' : ''}
                                            `}>
                                                {member.photo_path ? (
                                                    /* eslint-disable-next-line @next/next/no-img-element */
                                                    <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/temporary_selfies/${member.photo_path}`} className="w-full h-full object-cover transform scale-x-[-1]" alt={member.name} />
                                                ) : <div className="w-full h-full flex items-center justify-center text-white/50"><User className="w-4 h-4" /></div>}
                                            </div>
                                        </div>
                                    </AdvancedMarker>
                                )
                            }

                            if (end && drawLine) {
                                elements.push(
                                    <AdvancedMarker key={`${member.id}-end`} position={end} zIndex={isFocused ? 55 : 15}>
                                        <div className="flex flex-col items-center group opacity-80 hover:opacity-100">
                                            {/* Avatar Pin - ORANGE BORDER */}
                                            <div className={`
                                                w-6 h-6 rounded-full overflow-hidden shadow-lg relative bg-charcoal
                                                border-2 border-orange-400 transition-transform hover:scale-110
                                            `}>
                                                <div className="w-full h-full flex items-center justify-center bg-orange-400 text-charcoal text-[8px] font-bold">
                                                    END
                                                </div>
                                            </div>
                                        </div>
                                    </AdvancedMarker>
                                )

                                elements.push(
                                    <MapPolyline
                                        key={`${member.id}-line`}
                                        path={[start, end]}
                                        options={{
                                            strokeColor: '#fb923c', // Orange-400
                                            strokeOpacity: 0.6,
                                            strokeWeight: 2,
                                            geodesic: true,
                                            icons: [{
                                                icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 2 },
                                                offset: '0',
                                                repeat: '10px'
                                            }]
                                        }}
                                    />
                                )
                            }

                            return elements
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
