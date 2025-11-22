"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Calendar } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function CompetitionOverview() {
  const { data: leaderboard } = useSWR("/api/leaderboard", fetcher, {
    refreshInterval: 5000,
  })

  const stats = {
    prizePool: "$10,000", // In production, this would come from settings
    competitionEndDate: "December 31, 2024", // In production, this would come from settings
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Prize Pool</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.prizePool}</div>
          <p className="text-xs text-muted-foreground mt-1">Total prize money</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Competition Ends</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.competitionEndDate}</div>
          <p className="text-xs text-muted-foreground mt-1">Final submission date</p>
        </CardContent>
      </Card>
    </div>
  )
}
