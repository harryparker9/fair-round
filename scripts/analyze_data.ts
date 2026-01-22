
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function analyzeAndWipe() {
    console.log("--- ANALYSIS ---")
    // 1. Count Rounds
    const { count: roundsCount, error: rErr } = await supabase.from('rounds').select('*', { count: 'exact', head: true })
    if (rErr) console.error("Rounds Error:", rErr)
    console.log(`Total Rounds: ${roundsCount}`)

    // 2. Count Members
    const { count: membersCount, error: mErr } = await supabase.from('party_members').select('*', { count: 'exact', head: true })
    if (mErr) console.error("Members Error:", mErr)
    console.log(`Total Members: ${membersCount}`)

    // 3. Find Empty Rounds
    const { data: rounds } = await supabase.from('rounds').select('id')
    const { data: members } = await supabase.from('party_members').select('round_id')

    // Set of round IDs that have at least one member
    const activeRoundIds = new Set(members?.map(m => m.round_id))
    const emptyRounds = rounds?.filter(r => !activeRoundIds.has(r.id)) || []

    console.log(`Empty Rounds (0 members): ${emptyRounds.length}`)

    // 4. Unique Names
    const { data: uniqueNames } = await supabase.from('party_members').select('name')
    const uniqueNameSet = new Set(uniqueNames?.map(n => n.name.trim().toLowerCase()))
    console.log(`Unique Names used: ${uniqueNameSet.size} (${Array.from(uniqueNameSet).slice(0, 5).join(', ')}...)`)
}

analyzeAndWipe()
