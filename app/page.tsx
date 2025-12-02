import { CompetitionOverview } from "@/components/competition-overview"
import { Leaderboard } from "@/components/leaderboard"
import { AdminSettings } from "@/components/admin-settings"
import { CompetitionRules } from "@/components/competition-rules"
import { PrizePoolCard } from "@/components/prize-pool-card" // Import the new component

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">FitBank Dashboard</h1>
              <p className="text-muted-foreground mt-1">Real-time heart rate competition tracking</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-muted-foreground">Live</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <PrizePoolCard /> {/* Place PrizePoolCard at the top */}
          <Leaderboard />

          <CompetitionOverview />

          <div className="grid gap-8 grid-cols-1">
            <CompetitionRules />
            <AdminSettings />
          </div>
        </div>
      </div>
    </div>
  )
}
