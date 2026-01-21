import { X, MapPin, Train, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PartyMemberRosterProps {
    members: any[]
    isOpen: boolean
    onClose: () => void
    isHost: boolean
    roundHostId: string | null
    currentStage: string
}

export function PartyMemberRoster({ members, isOpen, onClose, isHost, roundHostId, currentStage }: PartyMemberRosterProps) {
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
                        const isRoundHost = member.user_id === roundHostId // If we track user_id in members
                        // Fallback: we might not track roundHostId -> member mapping perfectly in frontend yet, so we can rely on isHost prop if needed or just skip for now.

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
                                        {/* Host Badge? We might not have roundHostId mapped to member.user_id readily available in this view, skipping for safe MVP unless passed explicitly */}
                                    </div>

                                    <div className="flex flex-col gap-0.5 mt-1">
                                        {/* Start Location */}
                                        <div className="flex items-center gap-1.5 text-xs text-white/60">
                                            {member.start_location_type === 'station' ? <Train className="w-3 h-3 text-pint-gold" /> :
                                                member.start_location_type === 'live' ? <MapPin className="w-3 h-3 text-fairness-green" /> :
                                                    <MapPin className="w-3 h-3 text-white" />}
                                            <span className="truncate">
                                                {member.start_location_type === 'station' ? `Station` : // ideally we show station name if we had it joined or stored
                                                    member.location?.address || 'Location Set'}
                                            </span>
                                        </div>

                                        {/* End Location */}
                                        <div className="flex items-center gap-1.5 text-xs text-white/40">
                                            {member.end_location_type === 'station' ? <Train className="w-3 h-3" /> :
                                                member.end_location_type === 'same' ? <Home className="w-3 h-3" /> :
                                                    <MapPin className="w-3 h-3" />}
                                            <span className="truncate">
                                                {member.end_location_type === 'same' ? 'Returns to Start' : 'Different Return'}
                                            </span>
                                        </div>
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
