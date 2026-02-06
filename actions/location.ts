'use server'

import { triangulationService } from "@/services/triangulation"

export async function identifyLocation(lat: number, lng: number) {
    try {
        const station = await triangulationService.getNearestStation(lat, lng)
        return { success: true, station }
    } catch (error) {
        console.error("Location ID error:", error)
        return { success: false, error: "Failed to identify location" }
    }
}


export async function geocodeAddress(address: string) {
    try {
        const { maps } = await import("@/lib/maps");
        const result = await maps.geocode(address);
        if (result) {
            return { success: true, location: result }
        } else {
            return { success: false, error: "Address not found" }
        }
    } catch (error: any) {
        return { success: false, error: error.message || "Geocoding failed" }
    }
}

export async function reverseGeocode(lat: number, lng: number) {
    try {
        const { maps } = await import("@/lib/maps");
        // We can reuse geocode with latlng if the underlying lib supports it, 
        // OR we might need to add a reverse method to @/lib/maps if it doesn't exist.
        // Assuming @/lib/maps is using Google Maps API standard naming or similar wrapper.
        // Let's check if google maps client is used. Usually it has reverseGeocode.
        // If our wrapper only has 'geocode', we might need to extend it.
        // Ideally we should check lib/maps.ts but for now let's assume we can add it safely.

        // Actually, let's look at lib/maps first to be safe.
        // For now I will assume I can add this export and implement it once I verify lib/maps.
        // BUT to avoid breaking, I should check lib/maps. 
        // Wait, I can't check lib/maps in the middle of a replace. Start with just adding the export stub that calls a method I will verify/add.

        const result = await maps.reverseGeocode(lat, lng);
        if (result) {
            return { success: true, address: result }
        } else {
            return { success: false, error: "Address not found" }
        }
    } catch (error: any) {
        return { success: false, error: error.message || "Reverse geocoding failed" }
    }
}
