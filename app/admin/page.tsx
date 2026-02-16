import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { Card } from "@/components/ui/card"
import { AdminPartyBrowser } from "@/components/admin-party-browser"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'
// Force redeploy: 2026-01-21 19:43

interface AdminPageProps {
    searchParams: Promise<{ secret?: string }>
}

async function getStats() {
    const db = supabaseAdmin || supabase

    // 1. Total Rounds Created
    const { count: roundsCount } = await db.from('rounds').select('*', { count: 'exact', head: true })

    // 2. Total Joins (Party Members entries)
    const { count: membersCount } = await db.from('party_members').select('*', { count: 'exact', head: true })

    // 3. Unique Users (by Name) - Client-side approximation
    // Fetch all names to count unique ones. 
    // Optimization: For huge scale, use .rpc or separate users table. For now, this is fine.
    const { data: allMembers } = await db.from('party_members').select('name')
    const uniqueNames = new Set(allMembers?.map(m => m.name.trim().toLowerCase())).size

    // 4. Top Starting Stations
    const { data: recentMembers } = await db
        .from('party_members')
        .select('start_station_id, start_location_type')
        .eq('start_location_type', 'station')
        .order('joined_at', { ascending: false })
        .limit(200)

    const stationCounts: Record<string, number> = {}
    recentMembers?.forEach(m => {
        if (m.start_station_id) {
            stationCounts[m.start_station_id] = (stationCounts[m.start_station_id] || 0) + 1
        }
    })

    // Sort top 5 IDs
    const topStationIds = Object.entries(stationCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id]) => id)

    // Fetch Station Names
    let topStations: { name: string, count: number }[] = []
    if (topStationIds.length > 0) {
        const { data: stations } = await db.from('stations').select('id, name').in('id', topStationIds)
        topStations = topStationIds.map(id => {
            const st = stations?.find(s => s.id === id)
            return {
                name: st?.name || 'Unknown Station',
                count: stationCounts[id]
            }
        })
    }

    // 5. Activity 7 Days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { count: recentRoundsCount } = await db
        .from('rounds')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString())

    return {
        roundsCount: roundsCount || 0,
        membersCount: membersCount || 0,
        uniqueNames: uniqueNames || 0,
        recentRoundsCount: recentRoundsCount || 0,
        topStations
    }
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
    const params = await searchParams
    const secret = params.secret

    // Case-insensitive comparison for better UX
    if (secret?.toLowerCase() !== process.env.ADMIN_SECRET?.toLowerCase()) {
        console.error(`Admin access attempt blocked. Provided: '${secret}', Expected (hashed): ***`)
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-charcoal text-white p-4 text-center">
                <h1 className="text-4xl font-bold text-pint-gold mb-4">403 Forbidden</h1>
                <p className="text-white/60 mb-8 max-w-md">
                    Access to this page is restricted. Please ensure you have the correct administrative secret in the URL.
                </p>
                <div className="text-xs text-white/20 font-mono bg-black/20 px-4 py-2 rounded">
                    Error: INVALID_SECRET
                </div>
            </div>
        )
    }

    const stats = await getStats()
    const history = await getDetailedHistory()

    return (
        <div className="min-h-screen bg-charcoal text-white p-8">
            <div className="max-w-6xl mx-auto space-y-12">
                <header className="flex justify-between items-end border-b border-white/10 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-pint-gold">Fair Round Analytics</h1>
                        <p className="text-white/60">Business metrics and usage stats.</p>
                    </div>
                </header>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-white/5 border-white/10 p-6">
                        <p className="text-sm text-white/40 uppercase tracking-widest">Total Rounds</p>
                        <p className="text-4xl font-bold text-white mt-2">{stats.roundsCount}</p>
                        <p className="text-xs text-white/30 mt-1">Created rooms</p>
                    </Card>
                    <Card className="bg-white/5 border-white/10 p-6">
                        <p className="text-sm text-white/40 uppercase tracking-widest">Total Joins</p>
                        <p className="text-4xl font-bold text-fairness-green mt-2">{stats.membersCount}</p>
                        <p className="text-xs text-white/30 mt-1">Participants across all rounds</p>
                    </Card>
                    <Card className="bg-white/5 border-white/10 p-6">
                        <p className="text-sm text-white/40 uppercase tracking-widest">Est. Unique Users</p>
                        <p className="text-4xl font-bold text-blue-400 mt-2">{stats.uniqueNames}</p>
                        <p className="text-xs text-white/30 mt-1">Distinct names used</p>
                    </Card>
                    <Card className="bg-white/5 border-white/10 p-6">
                        <p className="text-sm text-white/40 uppercase tracking-widest">Last 7 Days</p>
                        <p className="text-4xl font-bold text-purple-400 mt-2">{stats.recentRoundsCount} <span className="text-lg text-white/40 font-normal">rounds</span></p>
                        <p className="text-xs text-white/30 mt-1">Recent activity</p>
                    </Card>
                </div>

                {/* NEW: Party Browser */}
                <div className="border-t border-white/5 pt-8">
                    <AdminPartyBrowser rounds={history} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                    {/* Top Stations */}
                    <Card className="bg-white/5 border-white/10 p-6">
                        <h3 className="text-xl font-bold text-white mb-4">Top Start Stations</h3>
                        <div className="space-y-3">
                            {stats.topStations.length === 0 ? (
                                <p className="text-white/40">No station data yet.</p>
                            ) : (
                                stats.topStations.map((s, i) => (
                                    <div key={i} className="flex justify-between items-center border-b border-white/5 pb-2 last:border-0">
                                        <span className="text-white font-medium">{i + 1}. {s.name}</span>
                                        <span className="bg-pint-gold/20 text-pint-gold px-2 py-0.5 rounded text-sm font-bold">{s.count}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>

                    {/* Growth Estimate (Static for MVP) */}
                    <Card className="bg-white/5 border-white/10 p-6">
                        <h3 className="text-xl font-bold text-white mb-4">Launch & Reset</h3>
                        <div className="space-y-4">
                            <p className="text-sm text-white/70">
                                Ready to launch? You can wipe all usage data to start fresh.
                            </p>
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
                                <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                                    🛑 Data Wipe
                                </h4>
                                <p className="text-xs text-red-300/70 mb-4">
                                    To wipe data, run the <code>wipe_data.sql</code> script in your Supabase SQL Editor.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}

// Helper to fetch full history
async function getDetailedHistory() {
    const db = supabaseAdmin || supabase

    // 1. Fetch Rounds (Limit 100 recent)
    const { data: rounds } = await db
        .from('rounds')
        .select('id, code, created_at, status')
        .order('created_at', { ascending: false })
        .limit(100)

    if (!rounds) return []

    // 2. Fetch Members for these rounds
    const roundIds = rounds.map(r => r.id)
    const { data: members } = await db
        .from('party_members')
        .select('id, round_id, name, photo_path, start_location_type, transport_mode')
        .in('round_id', roundIds)

    // 3. Group
    const history = rounds.map(round => {
        const myMembers = members?.filter(m => m.round_id === round.id) || []
        return {
            ...round,
            members: myMembers
        }
    })

    return history
}
