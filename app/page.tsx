import { CreateRoundCard } from "@/components/create-round-card";
import { useState } from "react";


export default function Home() {
  const [view, setView] = useState<'intro' | 'action'>('intro')
  const [actionType, setActionType] = useState<'create' | 'join'>('create')

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-charcoal relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-charcoal/90 backdrop-blur-[2px]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pint-gold/10 rounded-full blur-[128px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fairness-green/10 rounded-full blur-[128px]" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg flex flex-col items-center gap-8 animate-fade-in-up">

        {view === 'intro' ? (
          <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in zoom-in duration-500">
            {/* Branding & Larry */}
            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white drop-shadow-xl">
                Fair Round
              </h1>

              <div className="w-40 h-40 mx-auto relative animate-float">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/larry.png" alt="Larry the Lares" className="w-full h-full object-contain drop-shadow-[0_0_25px_rgba(255,215,0,0.3)]" />
              </div>

              <div className="space-y-2 max-w-xs mx-auto">
                <p className="text-pint-gold font-bold text-lg uppercase tracking-widest">Fancy a pint?</p>
                <p className="text-white/80 text-base italic">
                  "Welcome to Fair Round. I’m Larry, and I'll help you find the best location to meet up at the pub."
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <button
                onClick={() => { setActionType('create'); setView('action'); }}
                className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-pint-gold/10 hover:border-pint-goldTransition-all transition-all duration-300 hover:scale-[1.02] shadow-xl"
              >
                <div className="flex flex-col items-center gap-3">
                  <span className="text-4xl group-hover:scale-110 transition-transform duration-300">🍺</span>
                  <span className="text-white font-bold text-lg">Start a Party</span>
                </div>
              </button>

              <button
                onClick={() => { setActionType('join'); setView('action'); }}
                className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-fairness-green/10 hover:border-fairness-green transition-all duration-300 hover:scale-[1.02] shadow-xl"
              >
                <div className="flex flex-col items-center gap-3">
                  <span className="text-4xl group-hover:scale-110 transition-transform duration-300">🎫</span>
                  <span className="text-white font-bold text-lg">Join a Party</span>
                </div>
              </button>
            </div>

            <HowItWorks />
          </div>
        ) : (
          <div className="w-full animate-in slide-in-from-bottom-8 fade-in duration-500">
            <CreateRoundCard
              initialTab={actionType}
              onBack={() => setView('intro')}
            />
          </div>
        )}

      </div>

    </main>
  );
}

function HowItWorks() {
  return (
    <details className="group w-full max-w-sm cursor-pointer mb-8">
      <summary className="flex items-center justify-center gap-2 text-xs text-white/40 uppercase tracking-widest hover:text-pint-gold transition-colors list-none select-none">
        <span>How it Works</span>
        <span className="group-open:rotate-180 transition-transform duration-300">▼</span>
      </summary>

      <div className="mt-4 space-y-4 bg-white/5 p-6 rounded-2xl border border-white/5 backdrop-blur-md animate-in slide-in-from-top-2 fade-in">
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-fairness-green/20 text-fairness-green flex items-center justify-center font-bold text-sm shrink-0">1</div>
          <div>
            <h3 className="text-white font-bold text-sm">Sync & Triangulate</h3>
            <p className="text-white/60 text-xs mt-1">We connect with live TfL data to find the "Fair Middle" travel time for everyone.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-pint-gold/20 text-pint-gold flex items-center justify-center font-bold text-sm shrink-0">2</div>
          <div>
            <h3 className="text-white font-bold text-sm">AI Vibe Check</h3>
            <p className="text-white/60 text-xs mt-1">Our AI Strategist helps you pick the best station based on lines and convenience.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">3</div>
          <div>
            <h3 className="text-white font-bold text-sm">Pub Selection</h3>
            <p className="text-white/60 text-xs mt-1">Vote on curated venues near the station to finalize the plan.</p>
          </div>
        </div>
      </div>
    </details>
  )
}
