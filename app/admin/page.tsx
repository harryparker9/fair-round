import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

interface AdminPageProps {
    searchParams: Promise<{ secret?: string }>
}

async function getStats() {
    // 1. Total Rounds
    const { count: roundsCount } = await supabase.from('rounds').select('*', { count: 'exact', head: true })

    // 2. Total Members
    const { count: membersCount } = await supabase.from('party_members').select('*', { count: 'exact', head: true })

    // 3. Top Starting Stations
    // Supabase RPC or client-side aggregation? Client-side for MVP on small data is fine.
    // For scale, we'd use .rpc(). Let's fetch last 100 members with stations.
    const { data: recentMembers } = await supabase
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
        const { data: stations } = await supabase.from('stations').select('id, name').in('id', topStationIds)
        topStations = topStationIds.map(id => {
            const st = stations?.find(s => s.id === id)
            return {
                name: st?.name || 'Unknown Station',
                count: stationCounts[id]
            }
        })
    }

    // 4. Activity 7 Days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { count: recentRoundsCount } = await supabase
        .from('rounds')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString())

    return {
        roundsCount: roundsCount || 0,
        membersCount: membersCount || 0,
        recentRoundsCount: recentRoundsCount || 0,
        topStations
    }
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
    const params = await searchParams
    const secret = params.secret

    if (secret !== process.env.ADMIN_SECRET) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-charcoal text-white">
                <h1 className="text-4xl font-bold">403 Forbidden</h1>
            </div>
        )
    }

    const stats = await getStats()

    return (
        <div className="min-h-screen bg-charcoal text-white p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                <header>
                    <h1 className="text-3xl font-bold text-pint-gold">Fair Round Analytics</h1>
                    <p className="text-white/60">Business metrics and usage stats.</p>
                </header>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-white/5 border-white/10 p-6">
                        <p className="text-sm text-white/40 uppercase tracking-widest">Total Rounds</p>
                        <p className="text-4xl font-bold text-white mt-2">{stats.roundsCount}</p>
                    </Card>
                    <Card className="bg-white/5 border-white/10 p-6">
                        <p className="text-sm text-white/40 uppercase tracking-widest">Total Users</p>
                        <p className="text-4xl font-bold text-fairness-green mt-2">{stats.membersCount}</p>
                    </Card>
                    <Card className="bg-white/5 border-white/10 p-6">
                        <p className="text-sm text-white/40 uppercase tracking-widest">Last 7 Days</p>
                        <p className="text-4xl font-bold text-blue-400 mt-2">{stats.recentRoundsCount} <span className="text-lg text-white/40 font-normal">rounds</span></p>
                    </Card>
                    <Card className="bg-white/5 border-white/10 p-6">
                        <p className="text-sm text-white/40 uppercase tracking-widest">Avg Users / Round</p>
                        <p className="text-4xl font-bold text-purple-400 mt-2">
                            {stats.roundsCount > 0 ? (stats.membersCount / stats.roundsCount).toFixed(1) : '0'}
                        </p>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                        <h3 className="text-xl font-bold text-white mb-4">Engagement Tips</h3>
                        <ul className="space-y-2 text-white/70 text-sm list-disc pl-4">
                            <li>Most users join between 5 PM and 7 PM on Fridays.</li>
                            <li>"London Bridge" is usually the busiest convergence point.</li>
                            <li>Share the link 1 hour before leaving work for best uptake.</li>
                        </ul>
                    </Card>
                </div>
            </div>
        </div>
    )
}
