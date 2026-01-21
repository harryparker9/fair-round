'use server'

import { supabase } from "@/lib/supabase"

export async function getRoundIdByCode(code: string) {
    if (!code || code.length < 6) return { success: false, error: 'Invalid code' }

    const { data, error } = await supabase
        .from('rounds')
        .select('id, status')
        .eq('code', code.toUpperCase())
        .maybeSingle()

    if (error) {
        console.error("Error fetching round:", error)
        return { success: false, error: 'System error' }
    }

    if (!data) return { success: false, error: 'Party not found' }
    if (data.status === 'ended' || data.status === 'expired') return { success: false, error: 'Party has ended' }

    return { success: true, roundId: data.id }
}
