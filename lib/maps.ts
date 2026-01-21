import { Client } from "@googlemaps/google-maps-services-js";

const client = new Client({});
const key = process.env.GOOGLE_MAPS_API_KEY || "";

export const maps = {
    // Get detailed route info
    getRoute: async (origin: string, destination: string, mode: 'transit' | 'walking' | 'bicycling' = 'transit') => {
        if (!key) throw new Error("Missing Google Maps API Key");

        // @ts-ignore - Typescript might complain about partial params
        return client.directions({
            params: {
                origin,
                destination,
                mode: mode as any,
                key
            }
        });
    },

    // Matrix for multiple origins to candidates
    getDistances: async (origins: string[], destinations: string[], mode: 'transit' | 'walking' = 'transit') => {
        if (!key) throw new Error("Missing Google Maps API Key");

        return client.distancematrix({
            params: {
                origins,
                destinations,
                mode: mode as any,
                key
            }
        });
    },

    // Find candidates around a point
    searchNearbyPubs: async (location: { lat: number, lng: number }, radius: number = 1000, filters: string[] = []) => {
        if (!key) {
            console.error("GOOGLE_MAPS_API_KEY is missing on server.");
            throw new Error("Missing Google Maps API Key on Server");
        }

        // Construct keyword based on filters
        // e.g. "pub beer garden", "gastropub", "pub sports"
        let keyword = 'pub';
        if (filters.length > 0) {
            keyword += ' ' + filters.join(' ');
        }

        try {
            return await client.placesNearby({
                params: {
                    location,
                    radius,
                    type: 'bar', // or 'point_of_interest' with keyword 'pub'
                    keyword,
                    key
                }
            })
        } catch (e: any) {
            console.error("Google Maps Places API Error:", e.response?.data || e.message);
            throw new Error("Maps API Failed: " + (e.response?.data?.error_message || e.message));
        }
    },

    // Get area name from coordinates (Reverse Geocoding)
    getNeighborhood: async (lat: number, lng: number) => {
        if (!key) return "Unknown Area";

        try {
            const res = await client.reverseGeocode({
                params: {
                    latlng: { lat, lng },
                    result_type: ['neighborhood', 'sublocality', 'political'] as any,
                    key
                }
            });

            if (res.data.results.length > 0) {
                // Try to find the most specific 'neighborhood' component
                const result = res.data.results[0];
                const neighborhood = result.address_components.find(c => c.types.includes('neighborhood' as any))?.long_name;
                const sublocality = result.address_components.find(c => c.types.includes('sublocality' as any))?.long_name;
                const locality = result.address_components.find(c => c.types.includes('locality' as any))?.long_name;

                return neighborhood || sublocality || locality || "London";
            }
            return "Unknown Area";
        } catch (error) {
            console.error("Reverse Geocode Error", error);
            return "London Area";
        }
    },

    // Get Place Details (Summary & Reviews)
    getPlaceDetails: async (placeId: string) => {
        if (!key) return null;

        try {
            const res = await client.placeDetails({
                params: {
                    place_id: placeId,
                    fields: ['editorial_summary', 'reviews', 'rating', 'user_ratings_total'],
                    key
                }
            });
            return res.data.result;
        } catch (e) {
            console.error("Place Details Error:", e);
            return null;
        }
    }
};
