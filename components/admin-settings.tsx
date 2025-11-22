"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Settings, Save, Lock, Unlock } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

export function AdminSettings() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [password, setPassword] = useState("")
  const ADMIN_PASSWORD = "admin123" // In production, this should be in env variables

  const [competitionName, setCompetitionName] = useState("FitBank Challenge 2024")
  const [targetPoints, setTargetPoints] = useState("1000")
  const [z1, setZ1] = useState("")
  const [z2, setZ2] = useState("")
  const [z3, setZ3] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const { toast } = useToast()

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

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Competition settings have been updated successfully.",
    })
  }

  const handleLock = () => {
    setIsUnlocked(false)
    setPassword("")
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
            <Label htmlFor="target-points">Target Points</Label>
            <Input
              id="target-points"
              type="number"
              value={targetPoints}
              onChange={(e) => setTargetPoints(e.target.value)}
              placeholder="1000"
            />
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

          <Button onClick={handleSave} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
