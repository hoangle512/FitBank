"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Medal, Award } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function Leaderboard() {
  // Polls the API every 5 seconds for updates
  const { data } = useSWR("/api/leaderboard", fetcher, {
    refreshInterval: 5000,
  })

  const leaderboardList = data?.leaderboard || [];

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />
    if (index === 2) return <Award className="h-5 w-5 text-amber-600" />
    return <span className="text-muted-foreground text-sm w-5 text-center">{index + 1}</span>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Rank</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Participant</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Points</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Minutes</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Steps</th>

                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Coins</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Fails</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardList.map((participant: { username: string, total_points: number, minutes: number, total_steps_weekly: number, coins: number, fails: number }, index: number) => (
                <tr
                  key={participant.username}
                  className="border-b border-border hover:bg-secondary/50 transition-colors"
                >
                  <td className="p-3">
                    <div className="flex items-center justify-center w-8">{getRankIcon(index)}</div>
                  </td>
                  <td className="p-3">
                    <div>
                      <p className="font-medium">{participant.username}</p>

                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <p className="font-bold text-primary">{participant.total_points}</p>
                  </td>
                  <td className="p-3 text-right">
                    <p className="font-medium">{participant.minutes}</p>
                  </td>
                  <td className="p-3 text-right">
                    <p className="font-medium">{participant.total_steps_weekly}</p>
                  </td>

                  <td className="p-3 text-right">
                    {/* Displays Coins from DB (Wins) */}
                    <div className="flex items-center justify-end gap-1">
                        <span className="font-medium text-amber-500">{participant.coins ?? 0}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    {/* Displays Fails from DB */}
                    <p className="font-medium text-destructive">{participant.fails ?? 0}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!leaderboardList || leaderboardList.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">No participants yet</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}