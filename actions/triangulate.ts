'use server'

import { supabase } from "@/lib/supabase"
import { triangulationService } from "@/services/triangulation"

export async function triangulateRound(roundId: string, overrideCenter?: { lat: number, lng: number }) {
    // 1. Fetch Round and Members
    const { data: round } = await supabase
        .from('rounds')
        .select('*')
        .eq('id', roundId)
        .single()

    const { data: members } = await supabase
        .from('party_members')
        .select('*')
        .eq('round_id', roundId)

    if (!round || !members || members.length === 0) {
        throw new Error("Round or members not found")
    }

    // 2. Run Triangulation
    console.log("Finding fairest pubs...");
    if (!overrideCenter) throw new Error("Station center required for final triangulation");
    const recommendations = await triangulationService.findPubsNearStation(overrideCenter, members)
    console.log("Pubs found:", recommendations.length);

    // 3. Save to Cache
    console.log("Saving to pub_cache...");
    const { error: cacheError } = await supabase
        .from('pub_cache')
        .upsert(
            { round_id: roundId, results: recommendations },
            { onConflict: 'round_id' }
        )

    if (cacheError) {
        console.error("Cache Save Error:", cacheError);
        throw new Error("Failed to save pub results cache: " + cacheError.message);
    }

    // 4. Update Round Status (Optional)
    await supabase.from('rounds').update({ status: 'completed' }).eq('id', roundId)

    return recommendations
}
