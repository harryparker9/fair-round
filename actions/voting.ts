'use server'

import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-admin" // Import admin client
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
        const db = supabaseAdmin || supabase; // Prefer admin
        const { error } = await db
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

// 2. Member casts a vote (Guests can cast vote via Anon, usually allowed by RLS)
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
export async function finalizeVoting(roundId: string, winningAreaId: string, filters: string[] = []) {
    try {
        // 1. Get the round to find the winning area details
        const { data: round } = await supabase
            .from('rounds')
            .select('*')
            .eq('id', roundId)
            .single()

        if (!round) throw new Error("Round not found")

        // 2. Find the selected area object
        console.log("Finalizing Voting. Winning ID:", winningAreaId, typeof winningAreaId);

        const selectedArea = round.area_options?.find((a: any) => String(a.id) === String(winningAreaId))
        if (!selectedArea) {
            console.error(`Area ${winningAreaId} not found. Options:`, round.area_options?.map((a: any) => a.id));
            throw new Error(`Selected area configuration not found (ID: ${winningAreaId})`)
        }

        // 3. Trigger Triangulation with this specific center
        console.log("Calling triangulateRound...");
        try {
            await triangulateRound(roundId, selectedArea.center, filters)
        } catch (tError: any) {
            console.error("Triangulation internal error:", tError);
            throw new Error(`Triangulation failed: ${tError.message}`);
        }
        console.log("triangulateRound finished.");

        // 4. Update stage to pub_voting (Intermediate stage)
        console.log("Updating stage to pub_voting...");
        const db = supabaseAdmin || supabase; // Prefer admin
        const { error } = await db
            .from('rounds')
            .update({ stage: 'pub_voting' })
            .eq('id', roundId)

        if (error) {
            console.error("Error updating stage:", error);
            throw error
        }
        console.log("Stage updated. Finalize complete.");
        return { success: true }
    } catch (e: any) {
        console.error("Finalize Voting Error:", e)
        return { success: false, error: e.message || "Unknown error" }
    }
}

// 4. Host confirms the winning pub
export async function confirmPubWinner(roundId: string, pubId: string) {
    // Fetch current settings
    const { data: round } = await supabase.from('rounds').select('settings').eq('id', roundId).single()
    const currentSettings = round?.settings || {}

    const db = supabaseAdmin || supabase; // Prefer admin
    const { error } = await db
        .from('rounds')
        .update({
            stage: 'results',
            settings: { ...currentSettings, winning_pub_id: pubId }
        })
        .eq('id', roundId)

    if (error) throw error
    return { success: true }
}

// 5. Host ends the round
export async function endRound(roundId: string) {
    const db = supabaseAdmin || supabase;
    const { error } = await db
        .from('rounds')
        .update({ status: 'ended' })
        .eq('id', roundId)

    if (error) throw error
    return { success: true }
}

// 6. Host Reverts Stage (Go Back)
export async function regressStage(roundId: string, currentStage: string) {
    const db = supabaseAdmin || supabase;

    let targetStage = 'lobby';
    let updates: any = {};

    if (currentStage === 'results') {
        targetStage = 'pub_voting';
        updates = { settings: null }; // Clear winning pub
    } else if (currentStage === 'pub_voting') {
        targetStage = 'voting';
        // Keep areas, just re-vote
    } else if (currentStage === 'voting') {
        targetStage = 'lobby';
        updates = { area_options: [] }; // Clear options to force re-calculation
    }

    const { error } = await db
        .from('rounds')
        .update({
            stage: targetStage,
            ...updates
        })
        .eq('id', roundId)

    if (error) throw error
    return { success: true, targetStage }
}
