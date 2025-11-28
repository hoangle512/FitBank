"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Info } from "lucide-react"
import { useEffect, useState } from "react"

interface AdminSettings {
  z1: string;
  z2: string;
  z3: string;
  target_points: string;
}

export function CompetitionRules() {
  const [settings, setSettings] = useState<AdminSettings | null>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/admin/settings")
        if (res.ok) {
          const data = await res.json()
          setSettings(data)
        } else {
          console.error("Failed to fetch settings")
        }
      } catch (e) {
        console.error("Failed to fetch settings", e)
      }
    }
    fetchSettings()
  }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          <CardTitle>Competition Rules</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-foreground mb-1">1. Scoring</h4>
            <p className="mb-2">
              Points are awarded based on heart rate readings. Consistent monitoring and achieving target zones will earn you more points: 
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {settings && (
                <>
                  <li>Zone 1: <strong>{settings.z1}-{parseInt(settings.z2) - 1} BPM = 1 point</strong></li>
                  <li>Zone 2: <strong>{settings.z2}-{parseInt(settings.z3) - 1} BPM = 2 points</strong></li>
                  <li>Zone 3: <strong>{settings.z3}+ BPM = 3 points</strong></li>
                </>
              )}
              {!settings && (
                <>
                  <li>Zone 1: <strong>...-... BPM = 1 point</strong></li>
                  <li>Zone 2: <strong>...-... BPM = 2 points</strong></li>
                  <li>Zone 3: <strong>...+ BPM = 3 points</strong></li>
                </>
              )}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">2. Fails</h4>
            <p>
              <strong>{settings?.target_points ?? "..."} Points</strong> - If a participant fails to collect the minimum
              number of target points for the week, 1000czk goes into the bank.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">3. Winner Selection</h4>
            <p>
              The winner is determined by the highest total points at the end of each week and receives a coin. Coins can be used to pay for your fails.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">4. Prize Distribution</h4>
            <p>
              Prize pool will be spent on a social event at the end of the Competition.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
