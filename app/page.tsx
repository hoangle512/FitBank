import { CompetitionOverview } from "@/components/competition-overview"
import { Leaderboard } from "@/components/leaderboard"
import { AdminSettings } from "@/components/admin-settings"
import { CompetitionRules } from "@/components/competition-rules"
import { PrizePoolCard } from "@/components/prize-pool-card"

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Logo placeholder or simple text */}
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-white shadow-lg shadow-primary/25">
              FB
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              FitBank
            </h1>
          </div>

          <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </div>
            <span className="text-xs font-medium text-white/90">Competition Live</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CompetitionOverview />
        </div>

        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
          <Leaderboard />
          <PrizePoolCard />
          <CompetitionRules />

          <div className="pt-8 border-t border-border/50">
            <AdminSettings />
          </div>
        </div>
      </main>
    </div>
  )
}
