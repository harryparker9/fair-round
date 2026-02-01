'use client'

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
            <div className="space-y-8">
              <div className="space-y-2">
                <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                  Fair Round
                </h1>
                <p className="text-white/60 text-lg md:text-xl font-medium tracking-wide">
                  The fairest way to meet halfway.
                </p>
              </div>

              <div className="w-64 h-64 mx-auto relative animate-float mask-radial-faded">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/larry.png" alt="Larry the Lares" className="w-full h-full object-contain scale-110 drop-shadow-[0_0_50px_rgba(255,215,0,0.6)] mix-blend-plus-lighter" />
              </div>

              <div className="space-y-4 max-w-sm mx-auto">
                <p className="text-pint-gold font-bold text-lg uppercase tracking-[0.2em] animate-pulse">Fancy a pint?</p>
                <p className="text-white/70 text-lg font-light leading-relaxed">
                  "I’m <span className="text-white font-semibold">Larry</span>, your AI Navigator. First things first..."
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-xl mx-auto pt-4 px-2">
              <button
                onClick={() => { setActionType('create'); setView('action'); }}
                className="group relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/10 p-4 md:p-8 hover:bg-pint-gold/10 hover:border-pint-gold/50 transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,215,0,0.2)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-pint-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="flex flex-col items-center gap-3 relative z-10">
                  <span className="text-4xl md:text-5xl group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500 drop-shadow-2xl">🍺</span>
                  <span className="text-white font-bold text-base md:text-xl tracking-wide group-hover:text-pint-gold transition-colors">Start Party</span>
                </div>
              </button>

              <button
                onClick={() => { setActionType('join'); setView('action'); }}
                className="group relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/10 p-4 md:p-8 hover:bg-fairness-green/10 hover:border-fairness-green/50 transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(0,200,83,0.2)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-fairness-green/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="flex flex-col items-center gap-3 relative z-10">
                  <span className="text-4xl md:text-5xl group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500 drop-shadow-2xl">🎫</span>
                  <span className="text-white font-bold text-base md:text-xl tracking-wide group-hover:text-fairness-green transition-colors">Join Party</span>
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

      <div className="mt-4 space-y-6 bg-white/5 p-6 rounded-3xl border border-white/5 backdrop-blur-md animate-in slide-in-from-top-2 fade-in shadow-2xl">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-fairness-green/20 text-fairness-green flex items-center justify-center font-bold text-lg shrink-0 border border-fairness-green/20">1</div>
          <div className="text-left">
            <h3 className="text-white font-bold text-base">I Find the Middle</h3>
            <p className="text-white/60 text-sm mt-1 leading-snug">"I check everyone's location to calculate the absolute fairest travel time for the group."</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-pint-gold/20 text-pint-gold flex items-center justify-center font-bold text-lg shrink-0 border border-pint-gold/20">2</div>
          <div className="text-left">
            <h3 className="text-white font-bold text-base">I Sort the Trains</h3>
            <p className="text-white/60 text-sm mt-1 leading-snug">"I check live TfL data for delays and walking times so nobody gets stuck."</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg shrink-0 border border-blue-500/20">3</div>
          <div className="text-left">
            <h3 className="text-white font-bold text-base">We Pick the Pub</h3>
            <p className="text-white/60 text-sm mt-1 leading-snug">"I show you the top-rated spots nearby, and you vote for your favorite."</p>
          </div>
        </div>
      </div>
    </details>
  )
}
