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
