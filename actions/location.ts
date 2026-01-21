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
