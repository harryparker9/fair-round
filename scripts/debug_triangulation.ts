
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugStations() {
    console.log("--- Debugging Stations ---");

    // 1. Fetch all stations
    const { data: stations, error } = await supabase
        .from('stations')
        .select('*');

    if (error) {
        console.error("Error fetching stations:", error);
        return;
    }

    console.log(`Total stations in DB: ${stations.length}`);

    if (stations.length === 0) {
        console.log("No stations found! Database might be empty.");
        return;
    }

    // 2. Check a few stations (Amersham vs Greenwich)
    const amersham = stations.find(s => s.name.includes("Amersham"));
    const greenwich = stations.find(s => s.name.includes("Greenwich"));

    console.log("\n--- Sample Stations ---");
    if (amersham) console.log("Amersham:", amersham.name, amersham.location);
    if (greenwich) console.log("Greenwich:", greenwich.name, greenwich.location);

    // 3. Simulating Triangulation Logic
    console.log("\n--- Simulation ---");
    // User at Greenwich (approx)
    // 51.4764° N, 0.0005° W -> 51.4764, -0.0005
    // But coordinate parsing might be tricky
    const userLocation = { lat: 51.4764, lng: -0.0005 };
    console.log("User Location (Greenwich):", userLocation);

    const candidates = stations.map(station => {
        // Use cached columns
        const sLat = station.lat;
        const sLng = station.lng;

        if (!sLat || !sLng) {
            console.log("Missing lat/lng for:", station.name);
            return { name: station.name, parsed: { lat: 0, lng: 0 }, distSq: Infinity };
        }

        const dLat = sLat - userLocation.lat;
        const dLng = sLng - userLocation.lng;
        const distSq = dLat * dLat + dLng * dLng;

        return {
            name: station.name,
            parsed: { lat: sLat, lng: sLng },
            distSq
        };
    });

    const sorted = candidates.sort((a, b) => a.distSq - b.distSq).slice(0, 5);

    console.log("\n--- Top 5 Closest to Greenwich ---");
    sorted.forEach((s, i) => {
        console.log(`${i + 1}. ${s.name} (DistSq: ${s.distSq.toFixed(6)})`);
    });
}

debugStations();
