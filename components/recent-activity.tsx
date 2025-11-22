"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function RecentActivity() {
  const { data: heartRateData } = useSWR("/api/heart-rate", fetcher, {
    refreshInterval: 5000,
  })

  const recentData = heartRateData?.slice(0, 10) || []

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getBpmColor = (bpm: number) => {
    if (bpm < 60) return "text-blue-500"
    if (bpm < 100) return "text-green-500"
    if (bpm < 140) return "text-yellow-500"
    return "text-red-500"
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <CardTitle>Recent Activity</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {recentData.map((reading: any) => (
            <div
              key={reading.id}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border"
            >
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <div>
                  <p className="font-medium text-sm">{reading.username}</p>
                  <p className="text-xs text-muted-foreground">{formatTime(reading.timestamp)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold ${getBpmColor(reading.bpm)}`}>{reading.bpm} BPM</p>
                <p className="text-xs text-muted-foreground">+{reading.points} pts</p>
              </div>
            </div>
          ))}
          {recentData.length === 0 && <div className="text-center py-8 text-muted-foreground">No recent activity</div>}
        </div>
      </CardContent>
    </Card>
  )
}
