import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Using anon key, ensure RLS allows insert!

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TfLStopPoint {
    naptanId: string;
    commonName: string;
    lat: number;
    lon: number;
    lines: { name: string }[];
    additionalProperties: { key: string, value: string }[];
}

async function fetchFromTfL(mode: string) {
    console.log(`Fetching ${mode} stations from TfL...`);
    const res = await fetch(`https://api.tfl.gov.uk/StopPoint/Mode/${mode}`);
    if (!res.ok) {
        throw new Error(`Failed to fetch ${mode}: ${res.statusText}`);
    }
    const data = await res.json();
    return data.stopPoints || [];
}

async function seedStations() {
    console.log("Starting Seeding Process...");

    // 1. Fetch Data
    const modes = ['tube', 'dlr', 'overground', 'elizabeth-line'];
    let allStops: TfLStopPoint[] = [];

    for (const mode of modes) {
        try {
            const stops = await fetchFromTfL(mode);
            allStops = [...allStops, ...stops];
        } catch (e) {
            console.error(e);
        }
    }

    console.log(`Found ${allStops.length} raw stop points.`);

    // 2. Deduplicate and Format
    // Use commonName as a naive dedupe key for now, or naptanId? 
    // Stations often have multiple naptanIds (one per platform). We want the "Hub" or a representative point.
    // Ideally we filter for 'StopType' = 'NaptanMetroStation' etc.

    const uniqueStations = new Map<string, any>();

    for (const stop of allStops) {
        // Filter out irrelevant stops (bus stops sometimes leak in if mixed mode)
        if (stop.commonName.includes("Bus Station")) continue;

        // Try to find the Zone
        const zoneProp = stop.additionalProperties?.find(p => p.key === 'Zone');
        const zone = zoneProp ? parseInt(zoneProp.value) : null;

        if (!uniqueStations.has(stop.commonName)) {
            uniqueStations.set(stop.commonName, {
                name: stop.commonName,
                tfl_id: stop.naptanId,
                // Supabase expects 'POINT(lng lat)'
                location: `POINT(${stop.lon} ${stop.lat})`,
                lat: stop.lat,
                lng: stop.lon,
                lines: stop.lines.map(l => l.name),
                zone: zone
            });
        } else {
            // Merge lines if we see this station again (e.g. different entrance)
            const existing = uniqueStations.get(stop.commonName);
            const newLines = stop.lines.map(l => l.name);
            const combinedLines = Array.from(new Set([...existing.lines, ...newLines]));
            existing.lines = combinedLines;
        }
    }

    const stationsToInsert = Array.from(uniqueStations.values());
    console.log(`Prepared ${stationsToInsert.length} unique stations for insertion.`);

    // 3. Batched Insert
    const BATCH_SIZE = 50;
    for (let i = 0; i < stationsToInsert.length; i += BATCH_SIZE) {
        const batch = stationsToInsert.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('stations').upsert(batch, {
            onConflict: 'tfl_id', // Naive upsert
            ignoreDuplicates: false
        });

        if (error) {
            console.error(`Error inserting batch ${i}:`, error.message);
        } else {
            console.log(`Inserted batch ${i} - ${i + batch.length}`);
        }
    }

    console.log("Seeding Complete!");
}

seedStations();
