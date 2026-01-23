import { CreateRoundCard } from "@/components/create-round-card";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-charcoal relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-charcoal/90 backdrop-blur-[2px]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pint-gold/10 rounded-full blur-[128px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fairness-green/10 rounded-full blur-[128px]" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg flex flex-col items-center gap-8 animate-fade-in-up">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 text-center drop-shadow-sm">
          Fair Round
        </h1>
        <CreateRoundCard />

        <HowItWorks />
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
