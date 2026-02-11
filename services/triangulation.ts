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
    findFairestPubs: async (round: Round, members: PartyMember[], overrideCenter?: Coordinates, filters: string[] = []): Promise<PubRecommendation[]> => {
        // Resolve Locations (Start AND End)
        const resolvedMembers = await Promise.all(members.map(async (m) => {
            let startLoc = m.location;
            let endLoc = m.location; // Default to 'same'

            if (m.start_location_type === 'station' && m.start_station_id) {
                const { data: s } = await supabase.from('stations').select('lat, lng').eq('id', m.start_station_id).single()
                if (s) startLoc = { lat: s.lat, lng: s.lng, address: 'Start Station' };
            }

            if (m.end_location_type === 'station' && m.end_station_id) {
                const { data: s } = await supabase.from('stations').select('lat, lng').eq('id', m.end_station_id).single()
                if (s) endLoc = { lat: s.lat, lng: s.lng, address: 'End Station' };
            } else if (m.end_location_type === 'custom' && m.end_lat && m.end_lng) {
                endLoc = { lat: m.end_lat, lng: m.end_lng, address: 'Custom End' };
            } else {
                endLoc = startLoc;
            }

            return { ...m, location: startLoc, endLocation: endLoc }
        }))

        const activeMembers = resolvedMembers.filter(m => m.status === 'ready' && m.location && (m.location.lat !== 0 || m.location.lng !== 0));
        if (activeMembers.length === 0) return [];

        // Centroid Logic: Center of (Start1 + End1 + Start2 + End2 ...)
        const pointsOfInterest: Coordinates[] = [];
        activeMembers.forEach(m => {
            if (m.location) pointsOfInterest.push(m.location);
            if (m.endLocation) pointsOfInterest.push(m.endLocation);
        });

        const searchCenter = overrideCenter || triangulationService.calculateCentroid(pointsOfInterest);

        // Search candidates near searchCenter (filters passed here)
        const pubsResponse = await maps.searchNearbyPubs(searchCenter, 1500, filters); // 1.5km search
        const candidates = pubsResponse.data.results.slice(0, 10); // Take top 10

        if (candidates.length === 0) return [];

        const origins = activeMembers.map(m => `${m.location!.lat},${m.location!.lng}`);
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
            let maxTotalTime = 0;
            const travelTimes: Record<string, { to: number, home: number }> = {};

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

                // Best time TO venue
                const bestTimeTo = Math.min(time, walkTime);
                const durationTo = Math.round(bestTimeTo === 999 ? 0 : bestTimeTo);

                // Estimate Return Time
                // Note: We don't have a matrix for Venue -> EndLocs yet. 
                // For MVP speed, assume Return ~= To if End==Start.
                // If End != Start, we effectively need another Matrix call or ignore it.
                // To keep this fast: 
                // IF End is close to Start, use durationTo.
                // IF End is different, assume straight line ratio or just use DurationTo as a proxy + penalty?
                // Correct way: We should really do another Matrix call. But 10 pubs * 5 users = 50 elements. Expensive?
                // Let's use durationTo as proxy for "return" unless we want to slow it down.
                // User requirement: "know the travel time... to get home".
                // We MUST calculate it.

                // Simplified: Just use DurationTo for now to avoid blocking UI with double API calls, 
                // BUT if we want to be "Advanced", let's assume symmetric travel.
                let durationHome = durationTo;

                // TODO: Logic for different end location in Pubs is harder without 2nd Matrix Key.
                // We'll stick to symmetric assumption for Pubs for now to avoid quota limits/latency.

                travelTimes[member.id] = { to: durationTo, home: durationHome };
                const personTotal = durationTo + durationHome;
                totalTime += personTotal;
                if (personTotal > maxTotalTime) maxTotalTime = personTotal;
            });

            // Fairness Logic
            let score = totalTime;
            if (round.settings.mode === 'capped') {
                const cap = round.settings.max_travel_time || 40;
                if (maxTotalTime > cap * 2) { // Cap applies to single leg usually, so cap*2 for round trip?
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

        // Google Summary / Reviews Check
        const enhancedTop3 = await Promise.all(top3.map(async (c) => {
            // Fetch rich details
            const details = await maps.getPlaceDetails(c.placeId);

            let vibe = `Rated ${c.rating} stars.`;

            if (details) {
                // 1. Prefer Editorial Summary
                if (details.editorial_summary?.overview) {
                    vibe = details.editorial_summary.overview;
                }
                // 2. Fallback to Top Review
                else if (details.reviews && details.reviews.length > 0) {
                    // Find a review with text, preferably > 20 chars
                    const bestReview = details.reviews.find(r => r.text && r.text.length > 20) || details.reviews[0];
                    if (bestReview && bestReview.text) {
                        // Truncate if too long (max 150 chars)
                        vibe = `"${bestReview.text.length > 140 ? bestReview.text.substring(0, 140) + '...' : bestReview.text}"`;
                    }
                }
            }

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

    // 2. MAIN: AI Scout -> Reality -> Judge Pipeline
    findBestStations: async (members: PartyMember[], meetingTime?: string): Promise<{ strategy: string, recommendations: any[] }> => {
        console.log("Starting AI Triangulation...");

        // A. Resolve Locations
        const resolvedMembers = await Promise.all(members.map(async (m) => {
            let startLoc = m.location;
            let endLoc = m.location;
            let startName = 'Unknown';
            let endName = 'Same';

            if (m.start_location_type === 'station' && m.start_station_id) {
                const { data: s } = await supabase.from('stations').select('*').eq('id', m.start_station_id).single()
                if (s) { startLoc = { lat: s.lat, lng: s.lng }; startName = s.name; }
            } else if (m.start_location_type === 'live' || m.start_location_type === 'custom') {
                // Server-side Geocoding for Arnie
                if (m.location && (m.location.lat !== 0 || m.location.lng !== 0)) {
                    // Try to get a nice name if address is missing or generic
                    if (!m.location.address || m.location.address.startsWith('Pin') || m.location.address === 'Pinned Location') {
                        const areaName = await maps.getNeighborhood(m.location.lat, m.location.lng);
                        startName = `Near ${areaName}`;
                    } else {
                        startName = m.location.address;
                    }
                }
            }

            if (m.end_location_type === 'station' && m.end_station_id) {
                const { data: s } = await supabase.from('stations').select('*').eq('id', m.end_station_id).single()
                if (s) { endLoc = { lat: s.lat, lng: s.lng }; endName = s.name; }
            } else if (m.end_location_type === 'custom') {
                if (m.end_lat && m.end_lng) {
                    endLoc = { lat: m.end_lat!, lng: m.end_lng! };
                    const areaName = await maps.getNeighborhood(m.end_lat, m.end_lng);
                    endName = `Near ${areaName}`;
                } else {
                    endName = 'Custom Return';
                }
            } else {
                endLoc = startLoc;
            }

            return { ...m, location: startLoc, endLocation: endLoc, startName, endName }
        }));

        const activeMembers = resolvedMembers.filter(m => m.status === 'ready' && m.location);
        if (activeMembers.length === 0) return { strategy: "No active members found.", recommendations: [] };

        // B. Context Building
        const context = `Active Members: ${activeMembers.length}\n` + activeMembers.map(m =>
            `- ${m.name}: Starts at ${m.startName}, Ends at ${m.endName}`
        ).join('\n');

        // B1. GLOBAL STRATEGY (Transparency)
        let strategy = await gemini.generateStrategyNarrative(context);

        // C. SCOUT (Gemini)
        let candidates: any[] = [];

        // Retry Loop for AI Reliability
        let lastError = "Unknown Error";
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`Scouting stations (Attempt ${attempt}/3)...`);
                const suggestions = await gemini.scoutStations(context, meetingTime || "Now");

                if (suggestions.length > 0) {
                    console.log("AI Suggestions:", suggestions);
                    // Fetch ALL stations to do robust matching
                    const { data: allStations } = await supabase.from('stations').select('*');

                    if (allStations) {
                        candidates = suggestions.map(sName => {
                            // Fuzzy match name
                            const normalize = (s: string) => s.toLowerCase().replace(' station', '').trim();
                            const target = normalize(sName);
                            // Find match
                            const match = allStations.find(dbS => normalize(dbS.name).includes(target) || target.includes(normalize(dbS.name)));
                            return match;
                        }).filter(Boolean); // Remove nulls
                    }

                    if (candidates.length >= 3) break; // Success!
                } else {
                    console.warn(`Attempt ${attempt} yielded no suggestions.`);
                    lastError = "AI returned no valid suggestions";
                }
            } catch (e: any) {
                console.error(`AI Scout Attempt ${attempt} Failed:`, e);
                lastError = e.message || "Unknown AI Error";
            }

            // Backoff if not last attempt
            if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 500));
        }

        // FALLBACK: If AI returned nothing valid (or failed), use Math Shortlist
        if (candidates.length < 3) {
            console.log("AI Scout yielded too few results. Fallback to Math.");
            strategy += ` (Standard optimization used. AI Issue: ${lastError}).`;
            // We invoke the math version and wrap it
            const mathResults = await triangulationService.findBestStationsMath(members);
            return { strategy, recommendations: mathResults };
        }

        // D. REALITY CHECK (TfL Race) -> Replaced with Matrix Batching
        // OPTIMIZATION: Limit to Top 5 candidates to save API quota and prevent timeouts
        const topCandidatesToCheck = candidates.slice(0, 5);

        const scoredStations: any[] = [];

        // PREPARATION: Batch Requests
        if (topCandidatesToCheck.length > 0 && activeMembers.length > 0) {
            const memberOrigins = activeMembers.map(m => `${m.location!.lat},${m.location!.lng}`);
            const stationDestinations = topCandidatesToCheck.map(s => `${s.lat},${s.lng}`);

            // 1. OUTBOUND: Members -> Stations
            // 2. RETURN: Stations -> Members (or their End Locations)

            // Note: For Return, if end location differs significantly, we need a separate matrix.
            // To keep it simple and fast (2 calls max):
            // We'll treat return as "Station -> End Location".
            // If End == Start (most common), we can reuse MemberOrigins as Destinations for return?
            // Actually, Matrix API is Origins -> Destinations.
            // Return Trip: Origin = Station, Destination = Member End Loc.

            const memberEndDestinations = activeMembers.map(m =>
                m.endLocation ? `${m.endLocation.lat},${m.endLocation.lng}` : `${m.location!.lat},${m.location!.lng}`
            );

            let outboundMatrix: any = null;
            let returnMatrix: any = null;

            try {
                console.log(`Batching Matrix Calls for ${activeMembers.length} members x ${topCandidatesToCheck.length} stations...`);

                [outboundMatrix, returnMatrix] = await Promise.all([
                    maps.getDistances(memberOrigins, stationDestinations, 'transit'),
                    maps.getDistances(stationDestinations, memberEndDestinations, 'transit')
                ]);

            } catch (e) {
                console.error("Matrix Batch Failed:", e);
                // Fallback to 0s or empty logic handled below
            }

            // PROCESS RESULTS
            topCandidatesToCheck.forEach((station, sIdx) => {
                let totalTime = 0;
                let maxTotalTime = 0;
                const travelTimes: Record<string, any> = {};

                activeMembers.forEach((member, mIdx) => {
                    // Outbound: Member (Row mIdx) -> Station (Col sIdx)
                    let durationTo = 0;
                    let summaryTo = "Transit";

                    if (outboundMatrix?.data?.rows?.[mIdx]?.elements?.[sIdx]) {
                        const el = outboundMatrix.data.rows[mIdx].elements[sIdx];
                        if (el.status === 'OK') {
                            durationTo = Math.round(el.duration.value / 60);
                            // Summary not available in Matrix, imply "Transit"
                        }
                    }

                    // Return: Station (Row sIdx) -> Member End (Col mIdx)
                    let durationHome = 0;
                    let summaryHome = "Transit";

                    if (returnMatrix?.data?.rows?.[sIdx]?.elements?.[mIdx]) {
                        const el = returnMatrix.data.rows[sIdx].elements[mIdx];
                        if (el.status === 'OK') {
                            durationHome = Math.round(el.duration.value / 60);
                        }
                    }

                    // Fallback if Matrix failed (0s) -> Penalize or keep as 0? 
                    // Better to keep as 0 but maybe flag it? 
                    // For now, raw data.

                    travelTimes[member.name] = {
                        to: durationTo,
                        home: durationHome,
                        summary_to: summaryTo,
                        summary_home: summaryHome,
                        start_name: member.startName,
                        end_name: member.endName
                    };

                    const personTotal = durationTo + durationHome;
                    totalTime += personTotal;
                    if (personTotal > maxTotalTime) maxTotalTime = personTotal;
                });

                // Fairness Score
                let score = totalTime;
                if (maxTotalTime > 90) score += (maxTotalTime - 90) * 5;

                scoredStations.push({
                    id: station.id,
                    name: station.name,
                    description: `Zone ${station.zone || '?'} • ${station.lines?.[0] || 'Transport'}`,
                    lat: station.lat,
                    lng: station.lng,
                    travel_times: travelTimes,
                    fairness_score: score,
                    total_time: totalTime
                });
            });
        }

        const validScored = scoredStations.filter(s => s.total_time > 0).sort((a, b) => a.fairness_score - b.fairness_score);

        // E. JUDGE (Gemini)
        const topCandidates = validScored.slice(0, 5);
        let aiverdict: { winner_name: string, rationales: Record<string, string> } | null = null;
        try {
            console.log("Judging top candidates...");
            aiverdict = await gemini.judgeStations(topCandidates, context);
            console.log("AI Verdict:", aiverdict);
        } catch (e) {
            console.error("AI Judge Failed:", e);
        }

        // F. FORMAT FINAL RESULT
        const recommendations = topCandidates.slice(0, 3).map(s => {
            const isWinner = aiverdict && s.name === aiverdict.winner_name;
            // Get specific rationale if available, otherwise generic fallback
            let rationale = aiverdict?.rationales?.[s.name] || "Strategic option.";

            // If it IS the winner but no specific rationale found, fallback key might be slightly different (fuzzy match?)
            if (isWinner && !aiverdict?.rationales?.[s.name]) {
                rationale = "Selected as the best balance for the group.";
            }

            return {
                id: s.id,
                name: s.name,
                description: s.description,
                center: { lat: s.lat, lng: s.lng },
                travel_times: s.travel_times,
                fairness_score: s.fairness_score,
                ai_rationale: rationale,
                scoring: {
                    avg_time: Math.round(s.total_time / Math.max(1, activeMembers.length)),
                    max_time: Math.max(...Object.values(s.travel_times).map(t => t.to + t.home)),
                    total_time: s.total_time,
                    penalty: s.fairness_score - s.total_time,
                    outlier_name: Object.entries(s.travel_times).sort((a, b) => (b[1].to + b[1].home) - (a[1].to + a[1].home))[0]?.[0]
                }
            };
        });

        return { strategy, recommendations };
    },

    // 2. MATH FALLBACK: Find Best Stations (The "Station-First" Logical Core)
    findBestStationsMath: async (members: PartyMember[]): Promise<any[]> => {
        // Resolve Locations (Start AND End)
        const resolvedMembers = await Promise.all(members.map(async (m) => {
            let startLoc = m.location;
            let endLoc = m.location; // Default to 'same'
            let startName = 'Unknown';
            let endName = 'Same';

            // Resolve Start
            if (m.start_location_type === 'station' && m.start_station_id) {
                const { data: s } = await supabase.from('stations').select('name, lat, lng').eq('id', m.start_station_id).single()
                if (s) { startLoc = { lat: s.lat, lng: s.lng }; startName = s.name; }
            } else if (m.start_location_type === 'live' || m.start_location_type === 'custom') {
                startName = m.location?.address || `Pin (${m.location?.lat.toFixed(2)})`;
            }

            // Resolve End
            if (m.end_location_type === 'station' && m.end_station_id) {
                const { data: s } = await supabase.from('stations').select('name, lat, lng').eq('id', m.end_station_id).single()
                if (s) { endLoc = { lat: s.lat, lng: s.lng }; endName = s.name; }
            } else if (m.end_location_type === 'custom' && m.end_lat && m.end_lng) {
                endLoc = { lat: m.end_lat, lng: m.end_lng }; endName = 'Custom Return';
            } else {
                // if 'same' or 'live', end is start
                endLoc = startLoc;
            }

            return { ...m, location: startLoc, endLocation: endLoc, startName, endName }
        }))

        const activeMembers = resolvedMembers.filter(m => m.status === 'ready' && m.location && (m.location.lat !== 0 || m.location.lng !== 0));
        if (activeMembers.length === 0) return [];

        // A. Calculated Weighted Centroid (Start + End)
        // We effectively treat each member as TWO points for the fairness center
        const pointsOfInterest: Coordinates[] = [];
        activeMembers.forEach(m => {
            if (m.location) pointsOfInterest.push(m.location);
            if (m.endLocation) pointsOfInterest.push(m.endLocation);
        });

        const centroid = triangulationService.calculateCentroid(pointsOfInterest);

        // Fetch candidates
        const { data: allStations, error } = await supabase.from('stations').select('*');
        if (error || !allStations) return [];

        const candidates = allStations.map(station => {
            const sLat = station.lat || 0;
            const sLng = station.lng || 0;
            const dLat = sLat - centroid.lat;
            const dLng = sLng - centroid.lng;
            const distSq = dLat * dLat + dLng * dLng;
            return { ...station, distSq, lat: sLat, lng: sLng };
        })
            .sort((a, b) => a.distSq - b.distSq)
            .slice(0, 15);

        // B. Race them (Total Travel Time)
        // Process in chunks to avoid API rate limits
        const scoredStations = [];
        for (const station of candidates) {
            let totalTime = 0;
            let maxTotalTime = 0; // The longest single person's night
            const travelTimes: Record<string, {
                to: number;
                home: number;
                summary_to?: string;
                summary_home?: string;
                start_name?: string;
                end_name?: string;
            }> = {};

            const journeyPromises = activeMembers.map(async (member) => {
                // 1. To Venue
                const detailsTo = await transportService.getJourneyDetails(member.location!, { lat: station.lat, lng: station.lng });
                const durationTo = detailsTo?.duration || 0;
                const summaryTo = detailsTo?.summary || "Direct";

                // 2. To Home (Venue -> EndLoc)
                let durationHome = durationTo;
                let summaryHome = "Same as outbound";

                const isDifferent = Math.abs(member.location!.lat - member.endLocation!.lat) > 0.001 || Math.abs(member.location!.lng - member.endLocation!.lng) > 0.001;

                if (isDifferent) {
                    const params = await transportService.getJourneyDetails({ lat: station.lat, lng: station.lng }, member.endLocation!);
                    durationHome = params?.duration || durationTo;
                    summaryHome = params?.summary || "Direct";
                } else {
                    const params = await transportService.getJourneyDetails({ lat: station.lat, lng: station.lng }, member.endLocation!);
                    durationHome = params?.duration || durationTo;
                    summaryHome = params?.summary || "Direct";
                }

                return {
                    id: member.id,
                    name: member.name,
                    startName: member.startName,
                    endName: member.endName,
                    to: durationTo || 0,
                    home: durationHome || 0,
                    summaryTo,
                    summaryHome
                };
            });

            const results = await Promise.all(journeyPromises);

            results.forEach(res => {
                travelTimes[res.name] = {
                    to: res.to,
                    home: res.home,
                    summary_to: res.summaryTo,
                    summary_home: res.summaryHome,
                    start_name: res.startName,
                    end_name: res.endName
                };
                const personTotal = res.to + res.home;
                totalTime += personTotal;
                if (personTotal > maxTotalTime) maxTotalTime = personTotal;
            });

            // Fairness Score (Lower is better)
            let score = totalTime;
            // Penalty for anyone having > 90 mins total travel
            if (maxTotalTime > 90) score += (maxTotalTime - 90) * 5;

            scoredStations.push({
                id: station.id,
                name: station.name,
                description: `Zone ${station.zone || '?'} • ${station.lines?.[0] || 'Transport'}`,
                lat: station.lat,
                lng: station.lng,
                travel_times: travelTimes,
                fairness_score: score,
                total_time: totalTime
            });

            // Small delay
            await new Promise(resolve => setTimeout(resolve, 100));
        }



        // Deduplicate: Filter stations that are too close to a better-ranked station
        const uniqueStations: typeof scoredStations = [];
        const sortedCandidates = scoredStations.filter(s => s.total_time > 0).sort((a, b) => a.fairness_score - b.fairness_score);

        for (const candidate of sortedCandidates) {
            // Check if this candidate is within 300m of any already accepted candidate
            const isDuplicate = uniqueStations.some(accepted => {
                const dLat = (candidate.lat || 0) - (accepted.lat || 0);
                const dLng = (candidate.lng || 0) - (accepted.lng || 0);
                // Approx distance in degrees squared (0.003 degrees ~= 330m)
                const distSq = dLat * dLat + dLng * dLng;
                return distSq < 0.00001; // ~300-400m threshold
            });

            if (!isDuplicate) {
                uniqueStations.push(candidate);
            }
            if (uniqueStations.length >= 3) break; // We only need top 3 generic areas
        }

        return uniqueStations
            .map(s => ({
                id: s.id,
                name: s.name,
                description: s.description,
                center: { lat: s.lat, lng: s.lng },
                travel_times: s.travel_times,
                fairness_score: s.fairness_score,
                scoring: {
                    avg_time: Math.round(s.total_time / Math.max(1, activeMembers.length)),
                    max_time: Math.max(...Object.values(s.travel_times).map(t => t.to + t.home)),
                    total_time: s.total_time,
                    penalty: s.fairness_score - s.total_time,
                    outlier_name: Object.entries(s.travel_times).sort((a, b) => (b[1].to + b[1].home) - (a[1].to + a[1].home))[0]?.[0]
                }
            }));
    },

    // 3. Find Pubs (Only AFTER a station is selected)
    findPubsNearStation: async (stationLocation: Coordinates, members: PartyMember[], filters: string[] = [], radius: number = 800): Promise<PubRecommendation[]> => {
        // This is the "Verification" step basically. 
        // User picked "Waterloo". Now we show pubs near Waterloo.

        const activeMembers = members.filter(m => m.status === 'ready' && m.location);

        // 1. Search Google Places (Paid, but only 1 call now!)
        const pubsResponse = await maps.searchNearbyPubs(stationLocation, radius, filters); // Dynamic Radius
        const results = pubsResponse.data.results.slice(0, 10);

        if (results.length === 0) return [];

        // 2. Calculate Travel Times (Matrix)
        const origins = activeMembers.map(m => `${m.location!.lat},${m.location!.lng}`);
        const destinations = results.map(c => `${c.geometry?.location.lat},${c.geometry?.location.lng}`);

        let matrix: any = null;
        let walkingMatrix: any = null;

        if (origins.length > 0 && destinations.length > 0) {
            try {
                [matrix, walkingMatrix] = await Promise.all([
                    maps.getDistances(origins, destinations, 'transit'),
                    maps.getDistances(origins, destinations, 'walking')
                ]);
            } catch (e) {
                console.error("Matrix API Error in findPubsNearStation:", e);
            }
        }

        // 3. Vibe Check (Google) & Process Times
        const enhancedPubs = await Promise.all(results.map(async (place, index) => {
            // Fetch rich details
            const details = await maps.getPlaceDetails(place.place_id!);

            let vibe = `Rated ${place.rating} stars.`;

            if (details) {
                if (details.editorial_summary?.overview) {
                    vibe = details.editorial_summary.overview;
                } else if (details.reviews && details.reviews.length > 0) {
                    const bestReview = details.reviews.find(r => r.text && r.text.length > 20) || details.reviews[0];
                    if (bestReview && bestReview.text) {
                        vibe = `"${bestReview.text.length > 120 ? bestReview.text.substring(0, 120) + '...' : bestReview.text}"`;
                    }
                }
            }

            // Calculate Times
            let totalTime = 0;
            let maxTotalTime = 0;
            const travelTimes: Record<string, { to: number, home: number }> = {};

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

                // Best time TO venue
                const bestTimeTo = Math.min(time, walkTime);
                const durationTo = Math.round(bestTimeTo === 999 ? 0 : bestTimeTo);

                // Estimate Return (Symmetric for now)
                const durationHome = durationTo;

                travelTimes[member.id] = { to: durationTo, home: durationHome };
                const personTotal = durationTo + durationHome;
                totalTime += personTotal;
                if (personTotal > maxTotalTime) maxTotalTime = personTotal;
            });

            // Calculate Score
            let score = totalTime;
            if (maxTotalTime > 90) score += (maxTotalTime - 90) * 5;

            return {
                place_id: place.place_id!,
                name: place.name!,
                rating: place.rating || 0,
                vicinity: place.vicinity!,
                vibe_summary: vibe,
                travel_times: travelTimes,
                total_travel_time: totalTime,
                fairness_score: score, // Populate score
                location: place.geometry?.location
            };
        }));

        return enhancedPubs.sort((a, b) => a.fairness_score - b.fairness_score);
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
