'use server'

import { supabase } from '@/lib/supabase'

export async function searchStations(query: string) {
    if (!query || query.length < 2) return []

    const { data, error } = await supabase
        .from('stations')
        .select('id, name, lines, zone')
        .ilike('name', `%${query}%`)
        .limit(10)

    if (error) {
        console.error("Error searching stations:", error)
        return []
    }

    return data
}
