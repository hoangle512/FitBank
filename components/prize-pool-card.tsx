"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function PrizePoolCard() {
  const { data } = useSWR("/api/leaderboard", fetcher, {
    refreshInterval: 5000,
  })

  const totalFails = data?.total_fails || 0;
  const prizePool = totalFails * 1000;

  return (
    <div className="mx-auto max-w-sm"> {/* Centering the Prize Pool Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-center">
          <CardTitle className="text-sm font-medium text-muted-foreground">Prize Pool</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="text-center"> {/* Centering the text */}
          <div className="text-2xl font-bold">{prizePool} CZK</div>
          <p className="text-xs text-muted-foreground">Total prize money based on fails</p>
        </CardContent>
      </Card>
    </div>
  )
}
