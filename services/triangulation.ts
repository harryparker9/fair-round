import { maps } from "@/lib/maps";
import { gemini } from "@/lib/gemini";
import { transportService } from "@/services/transport";
import { supabase } from "@/lib/supabase";
import { PartyMember, Round, PubRecommendation, Coordinates } from "@/types";



export const triangulationService = {
    // 1. Calculate centroid (midpoint)
    calculateCentroid: (locations: Coordinates[]): Coordinates => {
        if (locations.length === 0) return { lat: 51.5074, lng: -0.1278 }; // Default London

        const latSum = locations.reduce((sum, loc) => sum + loc.lat, 0);
        const lngSum = locations.reduce((sum, loc) => sum + loc.lng, 0);

        return {
            lat: latSum / locations.length,
            lng: lngSum / locations.length
        };
    },

    // 2. Main workflow
    findFairestPubs: async (round: Round, members: PartyMember[], overrideCenter?: Coordinates): Promise<PubRecommendation[]> => {
        // Resolve Locations (Start Station vs Live)
        const resolvedMembers = await Promise.all(members.map(async (m) => {
            if (m.start_location_type === 'station' && m.start_station_id) {
                const { data: station } = await supabase.from('stations').select('lat, lng').eq('id', m.start_station_id).single()
                if (station) return { ...m, location: { lat: station.lat, lng: station.lng, address: 'Station' } }
            }
            return m
        }))

        const activeMembers = resolvedMembers.filter(m => m.status === 'ready' && m.location && (m.location.lat !== 0 || m.location.lng !== 0));
        if (activeMembers.length === 0) return [];

        const memberLocations = activeMembers.map(m => m.location! as Coordinates);

        // Use override center (from voting) OR calculate centroid
        const searchCenter = overrideCenter || triangulationService.calculateCentroid(memberLocations);

        // Search candidates near searchCenter
        const pubsResponse = await maps.searchNearbyPubs(searchCenter, 1500); // 1.5km search
        const candidates = pubsResponse.data.results.slice(0, 10); // Take top 10

        if (candidates.length === 0) return [];

        const origins = memberLocations.map(l => `${l.lat},${l.lng}`);
        const destinations = candidates.map(c => `${c.geometry?.location.lat},${c.geometry?.location.lng}`);

        // Parallel Fetch: Transit + Walking
        let matrix: any = null;
        let walkingMatrix: any = null;
        try {
            [matrix, walkingMatrix] = await Promise.all([
                maps.getDistances(origins, destinations, 'transit'),
                maps.getDistances(origins, destinations, 'walking')
            ]);
        } catch (e) {
            console.error("Matrix API Error:", e);
        }

        // Process Results
        const scoredCandidates = candidates.map((candidate, index) => {
            const placeId = candidate.place_id!;
            const name = candidate.name!;

            let totalTime = 0;
            let maxTime = 0;
            const travelTimes: Record<string, number> = {};

            activeMembers.forEach((member, mIndex) => {
                // Get Transit Time
                let time = 999;
                if (matrix?.data?.rows?.[mIndex]?.elements?.[index]?.duration?.value) {
                    time = matrix.data.rows[mIndex].elements[index].duration.value / 60;
                }

                // Get Walking Time
                let walkTime = 999;
                if (walkingMatrix?.data?.rows?.[mIndex]?.elements?.[index]?.duration?.value) {
                    walkTime = walkingMatrix.data.rows[mIndex].elements[index].duration.value / 60;
                }

                // Take the faster one (e.g. 7 min walk vs 44 min transit)
                const bestTime = Math.min(time, walkTime);
                const durationMin = Math.round(bestTime === 999 ? 0 : bestTime);

                travelTimes[member.id] = durationMin;
                totalTime += durationMin;
                if (durationMin > maxTime) maxTime = durationMin;
            });

            // Fairness Logic
            let score = totalTime;
            if (round.settings.mode === 'capped') {
                const cap = round.settings.max_travel_time || 40;
                if (maxTime > cap) {
                    score += 1000;
                }
            }

            return {
                placeId,
                name,
                rating: candidate.rating || 0,
                vicinity: candidate.vicinity || '',
                vibe_summary: "Calculating vibe...",
                travel_times: travelTimes,
                total_travel_time: totalTime,
                fairness_score: score,
                location: candidate.geometry?.location
            };
        });

        // Top 3
        const top3 = scoredCandidates
            .sort((a, b) => a.fairness_score - b.fairness_score)
            .slice(0, 3);

        // Gemini Vibe Check
        const enhancedTop3 = await Promise.all(top3.map(async (c) => {
            const vibe = await gemini.generateVibeCheck(c.name, c.vicinity, c.rating);
            return { ...c, vibe_summary: vibe };
        }));

        return enhancedTop3.map(c => ({
            place_id: c.placeId,
            name: c.name,
            rating: c.rating,
            vicinity: c.vicinity,
            vibe_summary: c.vibe_summary,
            travel_times: c.travel_times,
            total_travel_time: c.total_travel_time,
            fairness_score: c.fairness_score
        }));
    },

    // 2. MAIN: Find Best Stations (The "Station-First" Logical Core)
    findBestStations: async (members: PartyMember[]): Promise<any[]> => {
        // Resolve Locations (Start Station vs Live)
        const resolvedMembers = await Promise.all(members.map(async (m) => {
            if (m.start_location_type === 'station' && m.start_station_id) {
                const { data: station } = await supabase.from('stations').select('lat, lng').eq('id', m.start_station_id).single()
                if (station) return { ...m, location: { lat: station.lat, lng: station.lng, address: 'Station' } }
            }
            return m
        }))

        const activeMembers = resolvedMembers.filter(m => m.status === 'ready' && m.location && (m.location.lat !== 0 || m.location.lng !== 0));
        if (activeMembers.length === 0) return [];

        const memberLocations = activeMembers.map(m => m.location! as Coordinates);

        // A. Geometric Center & Shortlisting
        const centroid = triangulationService.calculateCentroid(memberLocations);

        // Query Supabase for stations nearest to this centroid
        // We use the postgis <-> operator for Nearest Neighbor
        // Or simple distance if not indexed perfectly yet.
        // NOTE: Since we are in JS client, we use an RPC or a manual sort if the DB is small.
        // Actually, with Supabase Client, we can use `.rpc()` if we made a function, 
        // OR just fetch all stations (only 900 rows, tiny download) and filter in memory for speed/simplicity initially.
        // Let's implement the "Fetch All & Sort" for v1 (Maximum simplicity, 0 cost).

        const { data: allStations, error } = await supabase
            .from('stations')
            .select('*');

        if (error || !allStations) {
            console.error("Failed to fetch stations", error);
            return [];
        }

        // Sort by distance to centroid (Haversine-ish or simple euclidean for short distances)
        const candidates = allStations.map(station => {
            // Use the cached columns - typically float/double in DB comes back as number in JS
            const sLat = station.lat || 0;
            const sLng = station.lng || 0;

            // Fallback for old data if any (or if seeding failed to set cols)
            // But we assume schema update + re-seed. 

            const dLat = sLat - centroid.lat;
            const dLng = sLng - centroid.lng;
            const distSq = dLat * dLat + dLng * dLng;

            return { ...station, distSq, lat: sLat, lng: sLng };
        })
            .sort((a, b) => a.distSq - b.distSq)
            .slice(0, 15); // Top 15 closest stations

        // B. race them! (TfL API)
        const scoredStations = await Promise.all(candidates.map(async (station) => {
            let totalTime = 0;
            let maxTime = 0;
            const travelTimes: Record<string, number> = {};

            // Parallel requests for all users to THIS station
            const journeyPromises = activeMembers.map(async (member) => {
                const duration = await transportService.getJourneyDuration(member.location!, { lat: station.lat, lng: station.lng });
                return { id: member.id, name: member.name, duration: duration || 999 }; // 999 penalty
            });

            const results = await Promise.all(journeyPromises);

            results.forEach(res => {
                travelTimes[res.name] = res.duration;
                totalTime += res.duration;
                if (res.duration > maxTime) maxTime = res.duration;
            });

            // Fairness Score (Lower is better)
            // Penalty for someone having to travel > 45 mins?
            let score = totalTime;
            if (maxTime > 45) score += (maxTime - 45) * 5; // Heavy penalty for long trips

            return {
                id: station.id,
                name: station.name, // e.g. "Waterloo Underground Station"
                description: `Zone ${station.zone || '?'} • ${station.lines?.[0] || 'Transport'}`,
                lat: station.lat,
                lng: station.lng,
                travel_times: travelTimes,
                fairness_score: score,
                total_time: totalTime
            };
        }));

        // C. Return Top 3 Winners
        return scoredStations
            .sort((a, b) => a.fairness_score - b.fairness_score)
            .slice(0, 3)
            .map(s => ({
                id: s.id,
                name: s.name,
                description: s.description,
                center: { lat: s.lat, lng: s.lng }, // UI needs 'center'
                travel_times: s.travel_times,
                fairness_score: s.fairness_score
            }));
    },

    // 3. Find Pubs (Only AFTER a station is selected)
    findPubsNearStation: async (stationLocation: Coordinates, members: PartyMember[]): Promise<PubRecommendation[]> => {
        // This is the "Verification" step basically. 
        // User picked "Waterloo". Now we show pubs near Waterloo.

        // 1. Search Google Places (Paid, but only 1 call now!)
        const pubsResponse = await maps.searchNearbyPubs(stationLocation, 800); // 800m walk (~10 mins)
        const results = pubsResponse.data.results.slice(0, 10);

        // 2. Vibe Check (Gemini)
        // We don't need to recalculate travel times! 
        // The travel time to the PUB is basically "Station Time + 5 min walk". 
        // We can simplify and just show the pub details.

        const enhancedPubs = await Promise.all(results.map(async (place) => {
            const vibe = await gemini.generateVibeCheck(place.name!, place.vicinity!, place.rating || 0);
            return {
                place_id: place.place_id!,
                name: place.name!,
                rating: place.rating || 0,
                vicinity: place.vicinity!,
                vibe_summary: vibe,
                travel_times: {}, // UI expects this map, but we can leave empty or fill with station times?
                total_travel_time: 0,
                fairness_score: 0,
                location: place.geometry?.location
            };
        }));

        return enhancedPubs;
    },

    // 4. Helper: Get Nearest Station (for UI Confirmation)
    getNearestStation: async (lat: number, lng: number): Promise<{ name: string, distance: number, zone?: number } | null> => {
        const { data: allStations } = await supabase.from('stations').select('name, lat, lng, zone');
        if (!allStations) return null;

        let bestStation = null;
        let minDistSq = Infinity;

        for (const station of allStations) {
            // Simple Euclidean sort is fine for "nearest" display
            const dLat = (station.lat || 0) - lat;
            const dLng = (station.lng || 0) - lng;
            const distSq = dLat * dLat + dLng * dLng;

            if (distSq < minDistSq) {
                minDistSq = distSq;
                bestStation = station;
            }
        }

        if (!bestStation) return null;

        // Approx conversion to meters (very rough, lat degrees are ~111km)
        const distanceKm = Math.sqrt(minDistSq) * 111;

        return {
            name: bestStation.name,
            distance: Math.round(distanceKm * 1000), // meters
            zone: bestStation.zone
        };
    }
};
