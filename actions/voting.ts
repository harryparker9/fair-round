'use server'

import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-admin" // Import admin client
import { triangulationService } from "@/services/triangulation"
import { triangulateRound } from "./triangulate"

// 1. Host starts the voting logic
export async function startAreaVoting(roundId: string) {
    try {
        console.log(` Starting Area Voting for Round: ${roundId}`);

        // Fetch members
        const { data: members } = await supabase
            .from('party_members')
            .select('*')
            .eq('round_id', roundId)

        if (!members || members.length === 0) throw new Error("No party members found. Invite some friends first!")

        // Fetch round settings (for Meeting Time)
        const { data: round } = await supabase.from('rounds').select('settings').eq('id', roundId).single()
        const meetingTime = round?.settings?.meeting_time || undefined;

        // Update Round: save options and move to 'voting' stage
        const db = supabaseAdmin || supabase; // Prefer admin

        // 0. Set Loading State
        await db.from('rounds').update({ settings: { ...round?.settings, is_calculating: true } }).eq('id', roundId)

        // Generate Options (Gemini + Distance Matrix)
        const { strategy, recommendations } = await triangulationService.findBestStations(members, meetingTime)

        if (!recommendations || recommendations.length === 0) {
            throw new Error("Could not find any suitable areas. Try adjusting locations.")
        }

        const { error } = await db
            .from('rounds')
            .update({
                stage: 'voting',
                area_options: recommendations,
                settings: { ...round?.settings, ai_strategy: strategy, is_calculating: false } // Save Global Strategy & Clear Loading
            })
            .eq('id', roundId)

        if (error) throw error
        return { success: true, options: recommendations }
    } catch (e: any) {
        console.error("Area Voting Critical Error:", e)
        // Attempt to clear loading state if failed
        try {
            await supabaseAdmin.from('rounds').update({ settings: { is_calculating: false } }).eq('id', roundId)
        } catch (cleanupErr) {
            console.error("Failed to cleanup loading state", cleanupErr)
        }
        return { success: false, error: e.message || "Failed to calculate options. Please try again." }
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

// 2b. Member votes for a Pub
export async function castPubVote(memberId: string, pubId: string) {
    const { data, error } = await supabase
        .from('party_members')
        .update({ vote_pub_id: pubId })
        .eq('id', memberId)
        .select()

    if (error) throw error
    // If column doesn't exist, this will throw.
    if (!data || data.length === 0) {
        throw new Error(`Vote failed: Member ID ${memberId} not found or permission denied.`)
    }
}

// 3. Host finalizes the vote -> Moves to results
export async function finalizeVoting(roundId: string, winningAreaId: string, filters: string[] = [], radius: number = 800) {
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
            await triangulateRound(roundId, selectedArea.center, filters, radius)
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

// 7. Update Party Member (with Auto-Regression)
export async function updatePartyMember(roundId: string, memberId: string, data: any) {
    const db = supabaseAdmin || supabase;

    // 1. Update the member
    const { error: updateError } = await db
        .from('party_members')
        .update(data)
        .eq('id', memberId)

    if (updateError) throw updateError

    // 2. Check Round Stage
    const { data: round } = await db
        .from('rounds')
        .select('stage')
        .eq('id', roundId)
        .single()

    // 3. If needed, Regress and Notify
    if (round && round.stage !== 'lobby') {
        const { data: member } = await db.from('party_members').select('name').eq('id', memberId).single()
        const memberName = member?.name || 'A member'

        // Fetch current settings to preserve them
        const { data: currentRound } = await db.from('rounds').select('settings').eq('id', roundId).single()
        const existingSettings = currentRound?.settings || {}

        await db.from('rounds').update({
            stage: 'lobby',
            area_options: [], // Clear calculations
            settings: { ...existingSettings, system_message: `${memberName} changed their location. Recalculating...` }
        }).eq('id', roundId)

        return { success: true, regressed: true }
    }

    return { success: true, regressed: false }
}

// 8. Delete Party Member (Kick)
export async function deletePartyMember(roundId: string, memberId: string) {
    const db = supabaseAdmin || supabase;

    const { error } = await db
        .from('party_members')
        .delete()
        .eq('id', memberId)
        .eq('round_id', roundId)

    if (error) throw error
    return { success: true }
}

// 9. Join Round with Auto-Reset
export async function joinRoundWithReset(roundId: string, name: string, photoPath?: string) {
    const db = supabaseAdmin || supabase;

    // 1. Check current stage
    const { data: round } = await db.from('rounds').select('stage, settings').eq('id', roundId).single()

    // 2. Insert Member
    const { data: member, error } = await db
        .from('party_members')
        .insert({
            round_id: roundId,
            name,
            photo_path: photoPath,
            status: 'pending',
            transport_mode: 'walking'
        })
        .select()
        .single()

    if (error) throw error

    // 3. Reset if needed
    if (round && round.stage !== 'lobby') {
        await db.from('rounds').update({
            stage: 'lobby',
            area_options: [],
            settings: { ...round.settings, system_message: `${name} joined. Returning to lobby.` }
        }).eq('id', roundId)
    }

    return { success: true, member }
}
