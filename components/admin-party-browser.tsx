'use client'

import { useState } from 'react'
import { Card } from "@/components/ui/card"
import { Users, Calendar, MapPin, Clock } from "lucide-react"

interface PartyMember {
    id: string
    name: string
    photo_path?: string
    start_location_type?: string
    transport_mode?: string
}

interface RoundData {
    id: string
    code: string
    created_at: string
    status: string
    members: PartyMember[]
}

interface AdminPartyBrowserProps {
    rounds: RoundData[]
}

export function AdminPartyBrowser({ rounds }: AdminPartyBrowserProps) {
    const [filter, setFilter] = useState('')

    const filteredRounds = rounds.filter(r =>
        r.code.includes(filter.toUpperCase()) ||
        r.members.some(m => m.name.toLowerCase().includes(filter.toLowerCase()))
    )

    return (
        <section className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Party Roll Call</h2>
                <input
                    type="text"
                    placeholder="Search code or name..."
                    className="bg-white/5 border border-white/10 rounded-full px-4 py-1 text-sm text-white focus:outline-none focus:border-pint-gold"
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>

            {/* Scrollable Container (Swipe View) */}
            <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {filteredRounds.map((round) => (
                    <Card key={round.id} className="min-w-[300px] max-w-[320px] bg-white/5 border-white/10 p-0 overflow-hidden flex-shrink-0 snap-center flex flex-col">
                        {/* Header */}
                        <div className="p-4 bg-black/20 border-b border-white/5 flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-bold text-pint-gold tracking-widest">{round.code}</h3>
                                <div className="flex items-center gap-1 text-xs text-white/40 mt-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(round.created_at).toLocaleDateString()}</span>
                                    <span className="mx-1">•</span>
                                    <Clock className="w-3 h-3" />
                                    <span>{new Date(round.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${round.status === 'ended' ? 'bg-white/5 text-white/30' : 'bg-green-500/20 text-green-400'}`}>
                                {round.status}
                            </span>
                        </div>

                        {/* Members List */}
                        <div className="p-4 flex-1 overflow-y-auto max-h-[300px] space-y-3">
                            {round.members.length === 0 ? (
                                <p className="text-white/20 text-sm text-center italic py-4">No members joined yet.</p>
                            ) : (
                                round.members.map(member => (
                                    <div key={member.id} className="flex items-center gap-3">
                                        {/* Avatar */}
                                        <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden border border-white/10 flex-shrink-0">
                                            {member.photo_path ? (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img
                                                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/temporary_selfies/${member.photo_path}`}
                                                    alt={member.name}
                                                    className="w-full h-full object-cover transform scale-x-[-1]"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white/50">
                                                    {member.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{member.name}</p>
                                            <div className="flex items-center gap-2 text-[10px] text-white/50">
                                                {member.transport_mode && (
                                                    <span className="capitalize">{member.transport_mode.replace('_', ' ')}</span>
                                                )}
                                                {member.start_location_type && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="capitalize">{member.start_location_type}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer Totals */}
                        <div className="p-3 bg-white/5 border-t border-white/5 flex items-center justify-between text-xs text-white/40">
                            <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>{round.members.length}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span>ID: {round.id.slice(0, 4)}...</span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
            <p className="text-center text-xs text-white/20">Swipe to view history &bull; Showing {filteredRounds.length} rounds</p>
        </section>
    )
}
