'use client'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { PartyMember } from '@/types'
import { X } from 'lucide-react'

interface MemberMapModalProps {
    member: PartyMember | null
    isOpen: boolean
    onClose: () => void
    stationData: Record<string, { name: string, lat: number, lng: number }>
}

export function MemberMapModal({ member, isOpen, onClose, stationData }: MemberMapModalProps) {
    if (!member) return null

    // Helper to resolve coordinates
    const getCoords = (type?: string, stationId?: string, manualLoc?: any) => {
        if (type === 'station' && stationId) return stationData[stationId]
        if (type === 'live' || type === 'custom') return manualLoc
        return null
    }

    const startLoc = getCoords(member.start_location_type, member.start_station_id, member.location)
    const endLoc = getCoords(member.end_location_type, member.end_station_id, member.end_lat ? { lat: member.end_lat, lng: member.end_lng } : member.location)

    const center = startLoc || { lat: 51.5074, lng: -0.1278 }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="bg-charcoal border-white/10 text-white p-0 overflow-hidden max-w-2xl w-full h-[60vh] sm:h-[500px] sm:rounded-2xl">
                <div className="absolute top-4 right-4 z-50">
                    <button
                        onClick={onClose}
                        className="p-2 bg-black/50 text-white hover:bg-black/70 rounded-full backdrop-blur-md transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="absolute top-4 left-4 z-50 bg-charcoal/90 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-xl">
                    <h3 className="font-bold text-white">{member.name}'s Journey</h3>
                    <div className="text-xs text-white/60 flex flex-col gap-1 mt-1">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-fairness-green" />
                            <span>Start: {startLoc?.name || startLoc?.address || 'Unknown'}</span>
                        </div>
                        {member.end_location_type !== 'same' && (
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-pint-gold" />
                                <span>End: {endLoc?.name || 'Custom Return'}</span>
                            </div>
                        )}
                    </div>
                </div>

                <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
                    <Map
                        defaultCenter={center}
                        defaultZoom={11}
                        mapId="bf51a910020fa25a"
                        disableDefaultUI={true}
                        className="w-full h-full"
                    >
                        {/* Start Pin */}
                        {startLoc && (
                            <AdvancedMarker position={startLoc}>
                                <div className="flex flex-col items-center">
                                    <div className="bg-fairness-green text-charcoal text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 whitespace-nowrap shadow-md">
                                        Start
                                    </div>
                                    <Pin background={'#4ADE80'} borderColor={'#000'} glyphColor={'#000'} />
                                </div>
                            </AdvancedMarker>
                        )}

                        {/* End Pin */}
                        {endLoc && (JSON.stringify(endLoc) !== JSON.stringify(startLoc)) && (
                            <AdvancedMarker position={endLoc}>
                                <div className="flex flex-col items-center">
                                    <div className="bg-pint-gold text-charcoal text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 whitespace-nowrap shadow-md">
                                        End
                                    </div>
                                    <Pin background={'#FFD700'} borderColor={'#000'} glyphColor={'#000'} />
                                </div>
                            </AdvancedMarker>
                        )}
                    </Map>
                </APIProvider>
            </DialogContent>
        </Dialog>
    )
}
