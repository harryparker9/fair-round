import { X, MapPin, Train, Home } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGeocodedNames } from '@/hooks/use-geocoded-names'

interface PartyMemberRosterProps {
    members: any[]
    isOpen: boolean
    onClose: () => void
    isHost: boolean
    roundHostId: string | null
    currentStage: string
    stationNames?: Record<string, string>
}

export function PartyMemberRoster({ members, isOpen, onClose, isHost, roundHostId, currentStage, stationNames = {} }: PartyMemberRosterProps) {
    const { getStartName, getEndName } = useGeocodedNames(members)

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-start pt-16 pointer-events-none">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-charcoal/80 backdrop-blur-sm pointer-events-auto transition-opacity animate-in fade-in"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="w-full max-w-md bg-charcoal border-b border-white/10 shadow-2xl pointer-events-auto transform transition-transform animate-in slide-in-from-top-4 rounded-b-3xl overflow-hidden max-h-[80vh] flex flex-col">
                <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-white font-bold text-lg">Party Members ({members.length})</h3>
                    <button onClick={onClose} className="p-2 text-white/50 hover:text-white rounded-full hover:bg-white/10">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto p-4 space-y-3">
                    {members.map((member) => {
                        const isRoundHost = member.user_id === roundHostId

                        // Resolve Start Text
                        let startText = 'Location Set'
                        if (member.start_location_type === 'station') {
                            startText = stationNames[member.start_station_id] || 'Station'
                        } else {
                            const name = getStartName(member)
                            startText = (name === 'Pinned Location') ? 'Near Location' : (name || 'Near Location')
                            // Clean up address (remove postcode if too long)
                            if (startText.length > 30) startText = startText.split(',')[0] + '...'
                        }

                        // Resolve End Text
                        let endText = 'Returns to Start'
                        if (member.end_location_type === 'station') {
                            endText = stationNames[member.end_station_id] || 'Station Base'
                        } else if (member.end_location_type === 'same') {
                            endText = 'Returns to Start'
                        } else {
                            const name = getEndName(member)
                            endText = name || 'Different Return'
                        }

                        return (
                            <div key={member.id} className="bg-white/5 rounded-xl p-3 flex gap-3 items-center border border-white/5">
                                {/* Avatar */}
                                <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 relative bg-black/40 flex-shrink-0">
                                    {member.photo_path ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img
                                            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/temporary_selfies/${member.photo_path}`}
                                            alt={member.name}
                                            className="w-full h-full object-cover transform scale-x-[-1]"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white/50 font-bold">
                                            {member.name[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-white font-bold truncate">{member.name}</span>
                                    </div>

                                    <div className="flex flex-col gap-1 mt-1">
                                        {/* Start Location */}
                                        <div className="flex items-center gap-1.5 text-xs text-white/80">
                                            {member.start_location_type === 'station' ? <Train className="w-3 h-3 text-pint-gold" /> :
                                                member.start_location_type === 'live' ? <MapPin className="w-3 h-3 text-fairness-green" /> :
                                                    <MapPin className="w-3 h-3 text-white" />}
                                            <span className="truncate max-w-[200px]" title={startText}>
                                                {startText}
                                            </span>
                                        </div>

                                        {/* End Location - Only show if different */}
                                        {member.end_location_type !== 'same' && (
                                            <div className="flex items-center gap-1.5 text-xs text-white/50">
                                                {member.end_location_type === 'station' ? <Train className="w-3 h-3" /> : <Home className="w-3 h-3" />}
                                                <span className="truncate max-w-[200px]">
                                                    {endText}
                                                </span>
                                            </div>
                                        )}
                                        {member.end_location_type === 'same' && (
                                            <div className="flex items-center gap-1.5 text-xs text-white/30">
                                                <Home className="w-3 h-3" />
                                                <span>Returns to Start</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Vote Status (Optional) */}
                                {currentStage === 'voting' && (
                                    <div className={cn("w-2 h-2 rounded-full", member.vote_area_id ? "bg-green-500" : "bg-white/10")} title={member.vote_area_id ? "Voted" : "Waiting"} />
                                )}
                            </div>
                        )
                    })}
                </div>

                <div className="p-3 bg-white/5 border-t border-white/5 text-center">
                    <p className="text-[10px] text-white/30 uppercase tracking-widest">Fair Round &bull; {members.length} Members</p>
                </div>
            </div>
        </div>
    )
}
