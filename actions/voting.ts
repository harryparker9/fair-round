'use server'

import { supabase } from "@/lib/supabase"
import { triangulationService } from "@/services/triangulation"
import { triangulateRound } from "./triangulate"

// 1. Host starts the voting logic
export async function startAreaVoting(roundId: string) {
    try {
        // Fetch members
        const { data: members } = await supabase
            .from('party_members')
            .select('*')
            .eq('round_id', roundId)

        if (!members || members.length === 0) throw new Error("No members found")

        // Generate Options (Gemini + Distance Matrix)
        const options = await triangulationService.findBestStations(members)

        // Update Round: save options and move to 'voting' stage
        const { error } = await supabase
            .from('rounds')
            .update({
                stage: 'voting',
                area_options: options
            })
            .eq('id', roundId)

        if (error) throw error
        return { success: true, options }
    } catch (e: any) {
        console.error("Area Voting Error:", e)
        return { success: false, error: e.message || "Unknown error" }
    }
}

// 2. Member casts a vote
export async function castVote(memberId: string, areaId: string) {
    const { data, error } = await supabase
        .from('party_members')
        .update({ vote_area_id: areaId })
        .eq('id', memberId)
        .select()

    if (error) throw error
    if (!data || data.length === 0) {
        throw new Error(`Vote failed: Member ID ${memberId} not found or permission denied.`)
    }
}

// 3. Host finalizes the vote -> Moves to results
export async function finalizeVoting(roundId: string, winningAreaId: string) {
    // 1. Get the round to find the winning area details
    const { data: round } = await supabase
        .from('rounds')
        .select('*')
        .eq('id', roundId)
        .single()

    if (!round) throw new Error("Round not found")

    // 2. Find the selected area object
    // Loose comparison (string/number) just in case
    console.log("Finalizing Voting. Winning ID:", winningAreaId, typeof winningAreaId);
    console.log("Available Options:", JSON.stringify(round.area_options, null, 2));

    const selectedArea = round.area_options?.find((a: any) => String(a.id) === String(winningAreaId))
    if (!selectedArea) {
        console.error(`Area ${winningAreaId} not found in options. Available IDs:`, round.area_options?.map((a: any) => a.id));
        throw new Error(`Selected area configuration not found (ID: ${winningAreaId})`)
    }

    // 3. Trigger Triangulation with this specific center
    // We update the triangulateRound action to accept an override
    console.log("Calling triangulateRound...");
    await triangulateRound(roundId, selectedArea.center)
    console.log("triangulateRound finished.");

    // 4. Update stage to results
    console.log("Updating stage to results...");
    const { error } = await supabase
        .from('rounds')
        .update({ stage: 'results' })
        .eq('id', roundId)

    if (error) {
        console.error("Error updating stage:", error);
        throw error
    }
    console.log("Stage updated. Finalize complete.");
}
