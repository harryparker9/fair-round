'use client'

import Image from "next/image";

import { CreateRoundCard } from "@/components/create-round-card";
import { useState, useEffect } from "react";
import { useArnieHelp } from "@/components/arnie-help-context";


export default function Home() {
  const [view, setView] = useState<'intro' | 'action'>('intro')
  const [actionType, setActionType] = useState<'create' | 'join'>('create')
  const { setHelp } = useArnieHelp()

  useEffect(() => {
    setHelp({
      title: "What is Fair Round?",
      content: (
        <div className="space-y-4">
          <p>Welcome! I'm Arnie, your dedicated navigator. My job is to make meeting up in London fairer and easier for everyone.</p>
          <div className="space-y-2">
            <p className="font-bold text-pint-gold">How I do it:</p>
            <ul className="space-y-2">
              <li><strong>Fairness First:</strong> I calculate travel times for everyone in your group to find a central meeting point where no one travels significantly longer than anyone else.</li>
              <li><strong>Live Data:</strong> I check TfL status in real-time to avoid delays.</li>
              <li><strong>Great Pubs:</strong> Once we have a location, I curate a list of top-rated pubs for you to vote on.</li>
            </ul>
          </div>
          <p className="italic text-white/60">"No more arguing about who has to travel the furthest. I sort it out so you can focus on the pint."</p>
        </div>
      )
    })
  }, [setHelp])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-charcoal relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-charcoal/90 backdrop-blur-[2px]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pint-gold/10 rounded-full blur-[128px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fairness-green/10 rounded-full blur-[128px]" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg flex flex-col items-center gap-8 animate-fade-in-up">



        {view === 'intro' ? (
          <div className="w-full flex flex-col">

            {/* ACT 1: The Hook (Full Height) */}
            <div className="min-h-[100svh] flex flex-col items-center justify-center text-center space-y-12 animate-in fade-in zoom-in duration-500 max-w-2xl w-full mx-auto p-6 md:p-0 relative z-20">
              {/* Branding & Explanation */}
              <div className="space-y-6">
                <div className="relative w-64 h-64 md:w-80 md:h-80 mx-auto mb-4">
                  <Image
                    src="/logo-stacked.png"
                    alt="Fair Round"
                    fill
                    className="object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                    priority
                  />
                </div>
                <div className="space-y-4 max-w-lg mx-auto">
                  <p className="text-white/90 text-xl font-medium leading-relaxed">
                    The easiest way to meet friends halfway in London.
                  </p>
                  <p className="text-white/60 text-base leading-relaxed">
                    We use advanced AI to calculate travel times from everyone's location using live TfL data to find the absolute fairest meeting point, then suggest top-rated pubs nearby.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4 w-full px-2">
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

              <div className="mt-12 md:mt-24 pb-8 flex flex-col items-center gap-2 text-white/40 animate-bounce cursor-pointer hover:text-white transition-colors z-30"
                onClick={() => document.getElementById('meet-arnie')?.scrollIntoView({ behavior: 'smooth' })}>
                <span className="text-xs uppercase tracking-[0.2em] font-medium">Learn More</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></svg>
              </div>
            </div>

            {/* ACT 2: The Guide (Below Fold) */}
            <div id="meet-arnie" className="w-full bg-gradient-to-b from-transparent to-black/40 pb-24 pt-12 px-4 md:rounded-[3rem] md:mx-auto md:max-w-4xl border-t border-white/5 scroll-mt-12">
              <HowItWorks />
            </div>

          </div>
        ) : (
          <div className="w-full animate-in slide-in-from-bottom-8 fade-in duration-500 min-h-screen flex items-center justify-center">
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
    <div className="w-full mt-8 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-200">
      <div className="flex flex-col items-center mb-8 text-center max-w-lg mx-auto">
        <div className="w-32 h-32 relative mb-4 animate-float mask-radial-faded">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/arnie.png" alt="Arnie" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,215,0,0.5)] mix-blend-plus-lighter" />
        </div>
        <p className="text-pint-gold font-bold text-sm uppercase tracking-widest mb-2">Meet Arnie</p>
        <h3 className="text-white font-bold text-2xl mb-4">London's Most Experienced Navigator</h3>
        <p className="text-white/80 text-base leading-relaxed italic mb-6">
          "I spent 60 years driving a black cab through these streets. Now, I've traded my steering wheel for an algorithm to help you find the absolute fairest meeting point."
        </p>
        <p className="text-white/40 text-sm font-medium uppercase tracking-widest">Here is how I work:</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
        <div className="bg-white/5 p-5 rounded-2xl border border-white/5 backdrop-blur-sm">
          <div className="w-8 h-8 rounded-full bg-fairness-green/20 text-fairness-green flex items-center justify-center font-bold text-sm mb-3 border border-fairness-green/20">1</div>
          <h4 className="text-white font-bold text-sm mb-1">I Find the Middle</h4>
          <p className="text-white/60 text-xs leading-relaxed">"I verify everyone's location to calculate the absolute fairest travel time for the group."</p>
        </div>

        <div className="bg-white/5 p-5 rounded-2xl border border-white/5 backdrop-blur-sm">
          <div className="w-8 h-8 rounded-full bg-pint-gold/20 text-pint-gold flex items-center justify-center font-bold text-sm mb-3 border border-pint-gold/20">2</div>
          <h4 className="text-white font-bold text-sm mb-1">I Sort the Trains</h4>
          <p className="text-white/60 text-xs leading-relaxed">"I use our AI engine to check live TfL data for delays and disruptions so nobody gets stuck."</p>
        </div>

        <div className="bg-white/5 p-5 rounded-2xl border border-white/5 backdrop-blur-sm">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm mb-3 border border-blue-500/20">3</div>
          <h4 className="text-white font-bold text-sm mb-1">We Pick the Pub</h4>
          <p className="text-white/60 text-xs leading-relaxed">"I ask Gemini to curate the best pubs near the station, and you vote for your favorite."</p>
        </div>
      </div>
    </div>
  )
}
