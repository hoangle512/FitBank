"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Calendar } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function CompetitionOverview() {
  const { data } = useSWR("/api/leaderboard", fetcher, {
    refreshInterval: 5000,
  })

  const { data: adminSettings } = useSWR("/api/admin/settings", fetcher, {
    refreshInterval: 60000, // Refresh less frequently for settings
  })

  const totalFails = data?.total_fails || 0;
  const prizePool = totalFails * 1000;
  
  const competitionEndDate = adminSettings?.end_date || "N/A"; // Use fetched end_date

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Prize Pool</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{prizePool} CZK</div>
          <p className="text-xs text-muted-foreground mt-1">Total prize money based on fails</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Competition Ends</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{competitionEndDate}</div>
          <p className="text-xs text-muted-foreground mt-1">Final submission date</p>
        </CardContent>
      </Card>
    </div>
  )
}
