"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Settings, Save, Lock, Unlock, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

export function AdminSettings() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const ADMIN_PASSWORD = "admin123" // In production, move this to env variables!

  // State for settings
  const [competitionName, setCompetitionName] = useState("FitBank Challenge 2024")
  const [targetPoints, setTargetPoints] = useState("500")
  const [z1, setZ1] = useState("")
  const [z2, setZ2] = useState("")
  const [z3, setZ3] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  
  const { toast } = useToast()

  // Optional: Load current settings when component mounts
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings')
        if (res.ok) {
          const data = await res.json()
          if (data.target_points) setTargetPoints(data.target_points.toString())
          if (data.competition_name) setCompetitionName(data.competition_name)
          if (data.z1) setZ1(data.z1.toString())
          if (data.z2) setZ2(data.z2.toString())
          if (data.z3) setZ3(data.z3.toString())
          if (data.start_date) setStartDate(data.start_date)
          if (data.end_date) setEndDate(data.end_date)
        }
      } catch (e) {
        console.error("Failed to load settings")
      }
    }
    fetchSettings()
  }, [])

  const handleUnlock = () => {
    if (password === ADMIN_PASSWORD) {
      setIsUnlocked(true)
      toast({
        title: "Access granted",
        description: "You can now modify admin settings.",
      })
    } else {
      toast({
        title: "Access denied",
        description: "Incorrect password. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleLock = () => {
    setIsUnlocked(false)
    setPassword("")
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Send the new target to the API
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          competition_name: competitionName,
          target_points: parseInt(targetPoints),
          z1: parseInt(z1),
          z2: parseInt(z2),
          z3: parseInt(z3),
          start_date: startDate,
          end_date: endDate,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update settings');
      }

      toast({
        title: "Settings saved",
        description: `Target set to ${targetPoints}. Leaderboard updated.`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not save settings. Check console.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isUnlocked) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            <CardTitle>Admin Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">Admin Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              />
            </div>
            <Button onClick={handleUnlock} className="w-full">
              <Unlock className="h-4 w-4 mr-2" />
              Unlock Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Admin Settings</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLock}>
            <Lock className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="competition-name">Competition Name</Label>
            <Input
              id="competition-name"
              value={competitionName}
              onChange={(e) => setCompetitionName(e.target.value)}
              placeholder="Enter competition name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-points">Target Points (Weekly Fail Threshold)</Label>
            <Input
              id="target-points"
              type="number"
              value={targetPoints}
              onChange={(e) => setTargetPoints(e.target.value)}
              placeholder="500"
            />
            <p className="text-xs text-muted-foreground">Users with fewer than this many points in a week will get a "Fail".</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="z1">Z1</Label>
              <Input id="z1" type="number" value={z1} onChange={(e) => setZ1(e.target.value)} placeholder="Zone 1" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="z2">Z2</Label>
              <Input id="z2" type="number" value={z2} onChange={(e) => setZ2(e.target.value)} placeholder="Zone 2" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="z3">Z3</Label>
              <Input id="z3" type="number" value={z3} onChange={(e) => setZ3(e.target.value)} placeholder="Zone 3" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <Button onClick={handleSave} disabled={isLoading} className="w-full">
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}