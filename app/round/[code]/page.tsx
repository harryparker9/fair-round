import { RoundManager } from "@/components/round-manager"
import { supabase } from "@/lib/supabase"
import { notFound } from "next/navigation"


// Allow 60 seconds for server actions on this page (AI Triangulation)
export const maxDuration = 60;

export default async function RoundPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = await params

    // Lookup round by code
    // Note: RLS policies must allow reading rounds by everyone for this to work without auth user.
    const { data: round } = await supabase
        .from('rounds')
        .select('id')
        .eq('code', code.toUpperCase())
        .single()

    // Dev/Demo Fallback if no DB connection or empty DB
    const isDev = process.env.NODE_ENV === 'development'
    const effectiveRoundId = round?.id || (isDev ? 'mock-round-id' : null)

    if (!effectiveRoundId) {
        notFound()
    }

    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-charcoal text-white relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-charcoal/90 backdrop-blur-[2px]" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-pint-gold/5 rounded-full blur-[100px]" />

            <div className="relative z-10 w-full flex justify-center p-4">
                <RoundManager roundId={effectiveRoundId} code={code.toUpperCase()} />
            </div>
        </main>
    )
}
