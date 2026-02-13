import { Coordinates } from "@/types";

const APP_ID = process.env.TFL_APP_ID;
const APP_KEY = process.env.TFL_APP_KEY;

// Base configuration
const BASE_URL = 'https://api.tfl.gov.uk';

export const transportService = {
    /**
     * Get the fastest journey details (duration + summary) between two points using TfL API.
     */
    getJourneyDetails: async (from: Coordinates, to: Coordinates, preference: 'train_only' | 'bus_only' | 'no_preference' = 'no_preference'): Promise<{ duration: number, summary: string } | null> => {
        try {
            // Format: "lat,lng"
            const fromStr = `${from.lat},${from.lng}`;
            const toStr = `${to.lat},${to.lng}`;

            // Map Preference to TfL Modes
            let modeParam = '';
            if (preference === 'train_only') {
                modeParam = '&mode=tube,dlr,overground,tflrail,elizabeth-line,national-rail,walking';
            } else if (preference === 'bus_only') {
                modeParam = '&mode=bus,walking';
            }

            // Query TfL Journey Planner
            // Default assumes all modes if param is empty
            const buildUrl = (modes: string) => `${BASE_URL}/Journey/JourneyResults/${fromStr}/to/${toStr}?timeIs=Departing&journeyPreference=LeastTime${modes}${APP_ID && APP_KEY ? `&app_id=${APP_ID}&app_key=${APP_KEY}` : ''}`;

            let url = buildUrl(modeParam);
            let res = await fetch(url);

            if (!res.ok) {
                console.warn(`TfL API Error: ${res.statusText}`);
                return null; // Fail gracefully
            }

            let data = await res.json();

            // RETRY LOGIC: If "train_only" yielded no results (e.g. need a bus to get to station), fallback to "any"
            if ((!data.journeys || data.journeys.length === 0) && preference === 'train_only') {
                console.log("No strictly train-only route found. Retrying with any mode...");
                url = buildUrl(''); // No preference = all modes
                res = await fetch(url);
                if (res.ok) {
                    data = await res.json();
                }
            }

            if (!data.journeys || data.journeys.length === 0) {
                return null; // No route found even after retry
            }

            // 1. Get the best journey (TfL sorts by best usually)
            const bestJourney = data.journeys[0];

            // 2. Extract duration (in minutes)
            const duration = bestJourney.duration;

            // 3. Construct Summary (e.g. "Walk to Station (10m) -> Northern line to Bank (15m)")
            const legs = bestJourney.legs.map((leg: any) => {
                const mode = leg.mode.name === 'walking' ? 'Walk' : (leg.routeOptions?.[0]?.name || leg.mode.name);
                const duration = leg.duration;
                const destination = leg.arrivalPoint?.commonName ? ` to ${leg.arrivalPoint.commonName}` : '';

                // Clean up mode names
                const cleanMode = mode.replace('London Underground', '').trim();

                return `${cleanMode}${destination} (${duration}m)`;
            });

            return {
                duration: duration,
                summary: legs.join(' → ')
            };

        } catch (error) {
            console.error("Transport Service Error:", error);
            return null;
        }
    }
};
