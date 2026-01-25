'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PubRecommendation, Round } from '@/types'
import { MapPin, Star, Clock, Beer } from 'lucide-react'
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'

interface PubVotingViewProps {
    pubs: PubRecommendation[]
    round: Round
    currentUserId: string // from localStorage
    onVote: (pubId: string) => void
    onConfirmWinner: (pubId: string) => void // HOST only
    isHost: boolean
    readOnly?: boolean
}

export function PubVotingView({ pubs, round, currentUserId, onVote, onConfirmWinner, isHost, readOnly }: PubVotingViewProps) {
    const [selectedPubId, setSelectedPubId] = useState<string | null>(null)

    // Center map on the first pub or average
    const defaultCenter = pubs.length > 0 ? pubs[0].location : { lat: 51.5074, lng: -0.1278 }

    const handleHostConfirm = () => {
        if (!selectedPubId) return
        onConfirmWinner(selectedPubId)
    }

    return (
        <div className="w-full max-w-lg space-y-4 animate-fade-in flex flex-col h-full">
            <div className="text-center space-y-1 shrink-0">
                <h2 className="text-2xl font-bold text-white">Choose Your Pub</h2>
                <p className="text-white/60 text-sm">Top 10 options within 10 min walk.</p>
            </div>

            {/* MAP SECTION */}
            <div className="w-full h-48 sm:h-64 rounded-xl overflow-hidden border border-white/10 shrink-0 relative">
                <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
                    <Map
                        defaultCenter={defaultCenter}
                        defaultZoom={15}
                        mapId="pub-voting-map"
                        disableDefaultUI={true}
                        className="w-full h-full"
                    >
                        {pubs.map((pub, idx) => (
                            <AdvancedMarker
                                key={pub.place_id}
                                position={pub.location || defaultCenter}
                                onClick={() => setSelectedPubId(pub.place_id)}
                                zIndex={selectedPubId === pub.place_id ? 50 : 10}
                            >
                                <div className={`flex flex-col items-center group cursor-pointer transition-transform ${selectedPubId === pub.place_id ? 'scale-110' : ''}`}>
                                    <div className={`
                                        text-[10px] font-bold px-2 py-0.5 rounded shadow-lg mb-1 whitespace-nowrap
                                        ${selectedPubId === pub.place_id
                                            ? 'bg-pint-gold text-charcoal border border-white'
                                            : 'bg-charcoal text-white border border-white/20'
                                        }
                                    `}>
                                        {idx + 1}. {pub.name}
                                    </div>
                                    <Pin
                                        background={selectedPubId === pub.place_id ? '#FFD700' : '#333'}
                                        borderColor={'#FFF'}
                                        glyphColor={selectedPubId === pub.place_id ? '#000' : '#FFF'}
                                        scale={selectedPubId === pub.place_id ? 1.2 : 1.0}
                                    />
                                </div>
                            </AdvancedMarker>
                        ))}
                    </Map>
                </APIProvider>
            </div>

            {/* LIST SECTION */}
            <div className="grid gap-3 overflow-y-auto pr-1 custom-scrollbar flex-1 min-h-0">
                {pubs.map((pub, i) => (
                    <Card
                        key={pub.place_id}
                        onClick={() => setSelectedPubId(pub.place_id)}
                        className={`p-4 cursor-pointer transition-all border-2 shrink-0 ${selectedPubId === pub.place_id
                            ? 'border-pint-gold bg-white/10 shadow-[0_0_15px_rgba(255,215,0,0.2)]'
                            : 'border-transparent bg-white/5 hover:bg-white/10'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg text-white leading-tight">
                                {i + 1}. {pub.name}
                            </h3>
                            <div className="flex items-center gap-1 text-pint-gold bg-pint-gold/10 px-2 py-0.5 rounded text-xs font-bold">
                                <Star className="w-3 h-3 fill-current" />
                                {pub.rating}
                            </div>
                        </div>

                        <p className="text-xs text-white/50 mb-3 line-clamp-1">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            {pub.vicinity}
                        </p>

                        <div className="bg-charcoal/50 p-2 rounded-lg border border-white/5 mb-3">
                            <p className="text-sm text-white/90 italic leading-relaxed">
                                {pub.vibe_summary}
                            </p>
                        </div>

                        {/* Metrics */}
                        <div className="flex gap-4 text-xs text-white/40">
                            <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {Math.round(pub.total_travel_time / (Object.keys(pub.travel_times).length || 1))} min tot
                            </div>
                            <div className="flex items-center gap-1">
                                <Beer className="w-3 h-3" />
                                Fair Score: {Math.round(pub.fairness_score)}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Sticky Actions */}
            <div className="sticky bottom-0 pt-4 bg-gradient-to-t from-charcoal via-charcoal to-transparent pb-2 shrink-0 z-10">
                {isHost && !readOnly ? (
                    <Button
                        onClick={handleHostConfirm}
                        disabled={!selectedPubId}
                        variant="primary"
                        size="lg"
                        className="w-full shadow-lg"
                    >
                        Lock In Winner 🔒
                    </Button>
                ) : (
                    <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                        <p className="text-white/70 text-sm animate-pulse">
                            {readOnly ? "Voting Closed" : "Waiting for Host to pick the winner..."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
