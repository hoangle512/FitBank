"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function CompetitionOverview() {
  const { data: adminSettings } = useSWR("/api/admin/settings", fetcher, {
    refreshInterval: 60000, // Refresh less frequently for settings
  })
  
  const competitionEndDate = adminSettings?.end_date || "N/A";

  return (
    <div className="grid gap-4 md:grid-cols-2"> {/* Remaining cards in a grid */}
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
