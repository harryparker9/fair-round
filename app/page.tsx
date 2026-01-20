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
      </div>
    </main>
  );
}
