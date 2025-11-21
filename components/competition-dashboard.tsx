"use client"

import { useEffect, useState } from "react"
import { Trophy, TrendingUp, Medal, Crown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getWeeklyStandings, type Standing } from "@/lib/actions"

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="size-5 text-accent" />
  if (rank === 2) return <Medal className="size-5 text-muted-foreground" />
  if (rank === 3) return <Medal className="size-5 text-amber-600" />
  return null
}

export function CompetitionDashboard() {
  const [standings, setStandings] = useState<Standing[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStandings = async () => {
      setIsLoading(true)
      const data = await getWeeklyStandings()
      setStandings(data)
      setIsLoading(false)
    }
    fetchStandings()
  }, [])

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">FitBank</h1>
          <p className="text-muted-foreground mt-1">Week 47 • Nov 18 - Nov 24, 2025</p>
        </div>
        <Badge variant="secondary" className="text-sm w-fit">
          <TrendingUp className="size-3 mr-1" />
          Live Standings
        </Badge>
      </div>

      {/* Prize Pot Widget */}
      <div className="flex justify-center">
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 max-w-md w-full">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 justify-center">
              <Trophy className="size-6 text-primary" />
              <CardTitle className="text-2xl">Prize Pool</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-2">
              <span className="text-5xl font-bold text-primary">25,000 Kč</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6">
        {/* Weekly Standings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-primary" />
              <CardTitle>Current Week Standings</CardTitle>
            </div>
            <CardDescription>Top performers this week</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Coins</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Loading standings...
                    </TableCell>
                  </TableRow>
                ) : standings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No standings available for this week yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  standings.map((player) => (
                    <TableRow key={player.rank} className="group">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getRankIcon(player.rank)}
                          <span>{Number(player.rank)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarImage
                              src={player.avatar || "/placeholder.svg"}
                              alt={player.username}
                            />
                            <AvatarFallback>{player.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{player.username}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {Number(player.score).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        {Number(player.coins)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Competition Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Competition Rules</CardTitle>
          <CardDescription>How the weekly competition works</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <div className="space-y-4 text-sm leading-relaxed">
            <div>
              <h3 className="text-base font-semibold mb-2 text-foreground">Scoring System</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>Win a match: <strong className="text-foreground">+200 points</strong></li>
                <li>Runner-up: <strong className="text-foreground">+100 points</strong></li>
                <li>Top 5 finish: <strong className="text-foreground">+50 points</strong></li>
                <li>Participation: <strong className="text-foreground">+10 points</strong></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-base font-semibold mb-2 text-foreground">Coin Rewards</h3>
              <p className="text-muted-foreground">
                Earn coins by completing matches and achieving high placements. Coins can be used for 
                entry into premium tournaments, purchasing cosmetic items, or exchanged for bonus entries. 
                Weekly coin bonuses are awarded to top 10 performers.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold mb-2 text-foreground">Prize Distribution</h3>
              <p className="text-muted-foreground">
                Prizes are distributed every Monday at 12:00 UTC. Winners will be contacted via email 
                within 48 hours. All prizes must be claimed within 30 days of notification. Tax documentation 
                may be required for prizes exceeding $600 USD.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold mb-2 text-foreground">Fair Play Policy</h3>
              <p className="text-muted-foreground">
                All participants must adhere to our fair play guidelines. Any form of cheating, 
                exploitation, or unsportsmanlike conduct will result in immediate disqualification 
                and potential account suspension. Reports are reviewed within 24 hours.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
