import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { triangulationService } from "@/services/triangulation"

export async function triangulateRound(roundId: string, overrideCenter?: { lat: number, lng: number }, filters: string[] = [], radius: number = 800) {
    console.log(`[Triangulate] Starting for Round ${roundId}`);

    // 1. Fetch Round and Members (Anon is fine for reading usually, or use admin if needed)
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
        console.error("[Triangulate] Round or members not found");
        throw new Error("Round or members not found")
    }

    // 2. Run Triangulation (Maps + Gemini)
    console.log("[Triangulate] Finding fairest pubs...");
    if (!overrideCenter) throw new Error("Station center required for final triangulation");

    let recommendations;
    try {
        recommendations = await triangulationService.findPubsNearStation(overrideCenter, members, filters, radius)
        console.log(`[Triangulate] Pubs found: ${recommendations.length}`);
    } catch (e: any) {
        console.error("[Triangulate] Logic failed:", e);
        throw new Error(`Triangulation Logic Failed: ${e.message}`);
    }

    // 3. Save to Cache (Use ADMIN client if avail to bypass RLS)
    console.log("[Triangulate] Saving to pub_cache...");
    const db = supabaseAdmin || supabase; // Prefer admin

    const { error: cacheError } = await db
        .from('pub_cache')
        .upsert(
            { round_id: roundId, results: recommendations },
            { onConflict: 'round_id' }
        )

    if (cacheError) {
        console.error("[Triangulate] Cache Save Error:", cacheError);
        // Important: logic failed if we can't save results, as UI depends on it
        throw new Error(`DB Cache Error (${cacheError.code}): ${cacheError.message}`);
    }

    // 4. Update Round Status (Optional)
    await db.from('rounds').update({ status: 'completed' }).eq('id', roundId)

    return recommendations
}
