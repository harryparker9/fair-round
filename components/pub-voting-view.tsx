'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PubRecommendation, Round, PartyMember } from '@/types'
import { MapPin, Star, ThumbsUp } from 'lucide-react'
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { cn } from '@/lib/utils'

interface PubVotingViewProps {
    pubs: PubRecommendation[]
    round: Round
    currentUserId: string // from localStorage
    members?: PartyMember[]
    onVote: (pubId: string) => void
    onConfirmWinner: (pubId: string) => void // HOST only
    isHost: boolean
    readOnly?: boolean
    onBack?: () => void
}

export function PubVotingView({ pubs, round, currentUserId, members = [], onVote, onConfirmWinner, isHost, readOnly, onBack }: PubVotingViewProps) {
    const [selectedPubId, setSelectedPubId] = useState<string | null>(pubs[0]?.place_id || null)
    const [viewMode, setViewMode] = useState<'carousel' | 'grid'>('carousel')
    const carouselRef = useRef<HTMLDivElement>(null)

    // Current User's Member ID
    const myMember = members.find(m => m.user_id === currentUserId || localStorage.getItem(`fair-round-member-id-${round.id}`) === m.id)
    const myMemberId = myMember?.id

    // Center map on the selected pub
    const selectedPub = pubs.find(p => p.place_id === selectedPubId) || pubs[0]
    // const mapCenter = selectedPub?.location || { lat: 51.5074, lng: -0.1278 } // Unused if fitting bounds
    const mapRef = useRef<google.maps.Map | null>(null); // Add separate ref for Map instance

    // Fit Bounds Effect
    useEffect(() => {
        if (!mapRef.current || pubs.length === 0) return;

        const bounds = new google.maps.LatLngBounds();
        let validPoints = 0;

        pubs.forEach(pub => {
            if (pub.location && typeof pub.location.lat === 'number' && typeof pub.location.lng === 'number') {
                if (pub.location.lat !== 0 || pub.location.lng !== 0) {
                    bounds.extend(pub.location);
                    validPoints++;
                }
            }
        });

        if (validPoints > 0) {
            mapRef.current.fitBounds(bounds);
        }
    }, [pubs, mapRef]);

    // Vote Counts
    const votes: Record<string, PartyMember[]> = {}
    members.forEach(m => {
        if (m.vote_pub_id) {
            if (!votes[m.vote_pub_id]) votes[m.vote_pub_id] = []
            votes[m.vote_pub_id].push(m)
        }
    })

    const handleScroll = () => {
        if (!carouselRef.current) return

        const scrollLeft = carouselRef.current.scrollLeft
        const width = carouselRef.current.offsetWidth
        const cardWidth = width * 0.85 // 85% width
        const gap = 12 // gap-3 is 12px

        // Calculate index based on center point
        const centerPoint = scrollLeft + (width / 2)
        const itemStride = cardWidth + gap

        // Adjust for padding (32px / 2rem)
        const effectiveScroll = scrollLeft
        const index = Math.round(effectiveScroll / itemStride)

        if (pubs[index] && pubs[index].place_id !== selectedPubId) {
            setSelectedPubId(pubs[index].place_id)
        }
    }

    const scrollToPub = (pubId: string) => {
        setSelectedPubId(pubId)
        const index = pubs.findIndex(p => p.place_id === pubId)
        if (index !== -1 && carouselRef.current) {
            const width = carouselRef.current.offsetWidth
            const cardWidth = width * 0.85
            const gap = 12

            // Center the item
            // scrollPos = (index * stride) - (containerWidth/2) + (cardWidth/2) - paddingAdjustment
            // Simplest is to scroll to the start of the item, minus padding/centering offset
            const stride = cardWidth + gap
            const centerOffset = (width - cardWidth) / 2

            carouselRef.current.scrollTo({
                left: (index * stride) - (centerOffset - 32), // 32 is pl-8
                behavior: 'smooth'
            })
        }
    }

    const hasVoted = !!myMember?.vote_pub_id

    return (
        <div className="w-full max-w-lg space-y-4 animate-fade-in flex flex-col min-h-full relative pb-10">

            {/* MAP SECTION */}
            <div className="w-full h-1/2 min-h-[40vh] rounded-xl overflow-hidden border border-white/10 shrink-0 relative shadow-2xl">
                <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
                    <Map
                        defaultZoom={12} // Adjusted default
                        mapId="pub-voting-map"
                        disableDefaultUI={true}
                        className="w-full h-full"
                        gestureHandling={'greedy'}
                        // @ts-ignore - ref type mismatch with library sometimes
                        ref={mapRef}
                    >
                        {pubs.map((pub, idx) => (
                            <AdvancedMarker
                                key={pub.place_id}
                                position={pub.location}
                                onClick={() => scrollToPub(pub.place_id)}
                                zIndex={selectedPubId === pub.place_id ? 50 : 10}
                            >
                                <div className={`flex flex-col items-center group cursor-pointer transition-transform duration-300 ${selectedPubId === pub.place_id ? 'scale-125 z-50' : 'scale-90 opacity-80'}`}>
                                    <Pin
                                        background={selectedPubId === pub.place_id ? '#FFD700' : '#333'}
                                        borderColor={'#FFF'}
                                        glyphColor={selectedPubId === pub.place_id ? '#000' : '#FFF'}
                                        scale={selectedPubId === pub.place_id ? 1.3 : 1.0}
                                    />
                                    {/* Only show label if selected */}
                                    {selectedPubId === pub.place_id && (
                                        <div className="mt-1 px-2 py-1 bg-charcoal text-white text-[10px] font-bold rounded border border-white/20 whitespace-nowrap shadow-xl animate-in fade-in slide-in-from-bottom-1">
                                            {pub.name}
                                        </div>
                                    )}
                                </div>
                            </AdvancedMarker>
                        ))}
                    </Map>
                </APIProvider>

                {/* Voting Prompt Overlay */}
                {!hasVoted && !readOnly && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2 pointer-events-none">
                        <span className="w-2 h-2 rounded-full bg-pint-gold animate-pulse" />
                        <span className="text-white text-xs font-bold">Cast your vote!</span>
                    </div>
                )}
            </div>

            {/* CAROUSEL SECTION */}
            <div className="relative -mt-12 z-20">
                <div
                    ref={carouselRef}
                    onScroll={handleScroll}
                    className="flex overflow-x-auto snap-x snap-mandatory gap-3 px-8 pb-4 hide-scrollbar"
                    style={{ scrollPaddingLeft: '2rem' }}
                >
                    {pubs.map((pub, i) => {
                        const isSelected = selectedPubId === pub.place_id
                        const myVote = myMember?.vote_pub_id === pub.place_id
                        const pubVotes = votes[pub.place_id] || []
                        const isArniesChoice = i === 0

                        return (
                            <Card
                                key={pub.place_id}
                                onClick={() => scrollToPub(pub.place_id)}
                                className={cn(
                                    "snap-center w-[85%] shrink-0 p-4 cursor-pointer transition-all border-2 flex flex-col gap-3 shadow-xl h-auto min-h-[180px] relative overflow-hidden",
                                    isSelected
                                        ? "border-pint-gold bg-charcoal shadow-[0_5px_20px_rgba(255,215,0,0.15)] scale-100 z-10"
                                        : "border-white/5 bg-charcoal/90 scale-95 opacity-80 hover:opacity-100"
                                )}
                            >
                                {isArniesChoice && (
                                    <div className="absolute top-0 right-0 bg-fairness-green text-charcoal text-[10px] font-bold px-2 py-1 rounded-bl-lg z-10 shadow-sm">
                                        Arnie's Pick 🚕
                                    </div>
                                )}

                                <div className="flex justify-between items-start mt-1">
                                    <div className="max-w-[80%]">
                                        <h3 className="font-bold text-lg text-white leading-tight line-clamp-2">
                                            {i + 1}. {pub.name}
                                        </h3>
                                        <p className="text-xs text-white/50 mt-1 line-clamp-1">
                                            <MapPin className="w-3 h-3 inline mr-1" />
                                            {pub.vicinity}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 text-pint-gold bg-pint-gold/10 px-2 py-1 rounded text-xs font-bold shrink-0">
                                        <Star className="w-3 h-3 fill-current" />
                                        {pub.rating}
                                    </div>
                                </div>

                                <div
                                    className="bg-white/5 p-2 rounded-lg border border-white/5 cursor-pointer active:scale-[0.98] transition-transform"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Simple toggle via class is hard without component state per item.
                                        // Let's use a class logic with a specific ID or just force it to always expand on click?
                                        // Actually, let's just make it expandable via local state if we extract component,
                                        // OR simpler: just `active:line-clamp-none`? No, user wants it to stay open or be openable.
                                        // Let's use a data attribute or class toggle on the element itself?
                                        // React way: We need state. But mapping inside. 
                                        // HACK: manipulating the class directly or using a small internal component.
                                        // Let's replace this card content with a extracted component or just use a dirty trick?
                                        // Better: Extract card to sub-component to handle state? formatting is complex.
                                        // Simplest: Check if we can just make it scrollable? "Expand to see all".
                                        // Let's try making it standard line-clamp-3 but if clicked, it removes the class.
                                        const el = e.currentTarget.querySelector('p');
                                        if (el) {
                                            if (el.classList.contains('line-clamp-3')) {
                                                el.classList.remove('line-clamp-3');
                                            } else {
                                                el.classList.add('line-clamp-3');
                                            }
                                        }
                                    }}
                                >
                                    <p className="text-xs text-white/80 italic leading-relaxed transition-all select-none">
                                        "{pub.vibe_summary}"
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="mt-auto flex gap-3 pt-2">
                                    {!readOnly && (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className={cn("flex-1 text-xs gap-2 h-8 transition-all", myVote ? "bg-fairness-green/20 text-fairness-green border-fairness-green/50 shadow-[0_0_10px_rgba(74,222,128,0.2)]" : "hover:bg-pint-gold/10 hover:text-pint-gold hover:border-pint-gold/50")}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onVote(pub.place_id)
                                            }}
                                        >
                                            <ThumbsUp className={cn("w-3 h-3", myVote && "fill-current")} />
                                            {myVote ? 'Voted' : 'Vote'}
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        )
                    })}
                </div>
            </div>

            {/* SCOREBOARD SECTION */}
            <div className="w-full bg-white/5 rounded-t-2xl border-t border-white/10 p-4 space-y-3 pb-32">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Scoreboard</h3>
                    {isHost && !readOnly && (
                        <span className="text-[10px] text-pint-gold animate-pulse">Tap below to Finish</span>
                    )}
                </div>

                {Object.entries(votes)
                    .sort(([, a], [, b]) => b.length - a.length)
                    .map(([pubId, voters]) => {
                        const pub = pubs.find(p => p.place_id === pubId)
                        if (!pub) return null
                        return (
                            <div key={pubId} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg animate-fade-in-up group border border-white/5 hover:border-white/10 transition-colors">
                                <div className="w-8 h-8 flex items-center justify-center bg-white/10 rounded font-bold text-white text-xs shrink-0">
                                    {voters.length}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-bold truncate">{pub.name}</p>
                                    <div className="flex -space-x-2 mt-1 overflow-visible py-1">
                                        {voters.map(v => (
                                            <div key={v.id} className="w-6 h-6 rounded-full border border-charcoal bg-white/20 relative overflow-hidden shrink-0" title={v.name}>
                                                {v.photo_path ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/temporary_selfies/${v.photo_path}`}
                                                        className="w-full h-full object-cover transform scale-x-[-1]"
                                                        alt={v.name}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[8px] text-white">{v.name[0]}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {isHost && !readOnly && (
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        className="h-8 px-3 bg-pint-gold text-black hover:bg-pint-gold/80 font-bold shadow-lg opacity-100 transform active:scale-95 transition-all whitespace-nowrap"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onConfirmWinner(pub.place_id)
                                        }}
                                    >
                                        Announce Winner
                                    </Button>
                                )}
                            </div>
                        )
                    })
                }
                {Object.keys(votes).length === 0 && (
                    <p className="text-center text-white/20 text-xs italic py-4">No votes yet...</p>
                )}
            </div>

            {/* Host Undo Button */}
            {isHost && onBack && (
                <div className="w-full flex justify-center pb-4">
                    <Button variant="ghost" onClick={onBack} className="text-white/30 hover:text-white text-xs">
                        ← Undo: Back to Area Selection
                    </Button>
                </div>
            )}

            {/* Waiting Message for Guest */}
            {hasVoted && !isHost && !readOnly && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-charcoal/95 backdrop-blur border-t border-white/10 flex justify-center z-50 animate-slide-up">
                    <p className="text-pint-gold text-sm font-bold animate-pulse">
                        Waiting for host to confirm...
                    </p>
                </div>
            )}
        </div>
    )
}
