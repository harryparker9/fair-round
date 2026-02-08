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

    // 2. CHECK CACHE FIRST (Cost Saving)
    const { data: cache } = await supabase
        .from('pub_cache')
        .select('*')
        .eq('round_id', roundId)
        .single();

    if (cache && cache.results && cache.results.length > 0) {
        // Check 1: Filters Match?
        // We sort both to ensure array order doesn't matter
        const cachedFilters = (cache.filters || []).sort().join(',');
        const currentFilters = (filters || []).sort().join(',');

        // Check 2: Location Matches? (Approximate - within ~11 meters or 0.0001 degrees)
        // If overrideCenter is provided, we must match it.
        const latDiff = Math.abs((cache.search_lat || 0) - (overrideCenter?.lat || 0));
        const lngDiff = Math.abs((cache.search_lng || 0) - (overrideCenter?.lng || 0));
        const locationMatch = overrideCenter ? (latDiff < 0.0001 && lngDiff < 0.0001) : true; // If no override, maybe we don't care, but usually we do.

        if (cachedFilters === currentFilters && locationMatch) {
            console.log("[Triangulate] Cache Hit! Returning saved results.");
            return cache.results;
        } else {
            console.log("[Triangulate] Cache Miss (Criteria changed). Searching fresh...");
            console.log(`- Filters: '${cachedFilters}' vs '${currentFilters}'`);
            console.log(`- Location Diff: lat=${latDiff.toFixed(5)}, lng=${lngDiff.toFixed(5)}`);
        }
    }

    // 3. Run Triangulation (Maps + Gemini)
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

    // 4. Save to Cache (Use ADMIN client if avail to bypass RLS)
    console.log("[Triangulate] Saving to pub_cache...");
    const db = supabaseAdmin || supabase; // Prefer admin

    const { error: cacheError } = await db
        .from('pub_cache')
        .upsert(
            {
                round_id: roundId,
                results: recommendations,
                filters: filters,
                search_lat: overrideCenter.lat,
                search_lng: overrideCenter.lng
            },
            { onConflict: 'round_id' }
        )

    if (cacheError) {
        console.error("[Triangulate] Cache Save Error:", cacheError);
        // Important: logic failed if we can't save results, as UI depends on it
        throw new Error(`DB Cache Error (${cacheError.code}): ${cacheError.message}`);
    }

    // 5. Update Round Status (Optional)
    await db.from('rounds').update({ status: 'completed' }).eq('id', roundId)

    return recommendations
}
