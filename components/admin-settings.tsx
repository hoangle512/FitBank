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
      const [prizePoolAdjustment, setPrizePoolAdjustment] = useState("0")
      const [users, setUsers] = useState<{ id: string, display_name: string | null }[]>([])
      
      const { toast } = useToast()
    
      // Load settings and users
      useEffect(() => {
        const fetchData = async () => {
          try {
            const [settingsRes, usersRes] = await Promise.all([
              fetch('/api/admin/settings'),
              fetch('/api/users') // Assuming you create this endpoint
            ]);
    
            if (settingsRes.ok) {
              const data = await settingsRes.json();
              if (data.target_points) setTargetPoints(data.target_points.toString());
              if (data.competition_name) setCompetitionName(data.competition_name);
              if (data.z1) setZ1(data.z1.toString());
              if (data.z2) setZ2(data.z2.toString());
              if (data.z3) setZ3(data.z3.toString());
              if (data.start_date) setStartDate(data.start_date);
              if (data.end_date) setEndDate(data.end_date);
              if (data.prize_pool_adjustment) setPrizePoolAdjustment(data.prize_pool_adjustment.toString());
            }
    
            if (usersRes.ok) {
              const usersData = await usersRes.json();
              setUsers(usersData.users);
            }
    
          } catch (error) {
            console.error("Failed to load data:", error);
            toast({ title: "Error", description: "Could not load settings or users.", variant: "destructive" });
          }
        };
        fetchData();
      }, [toast]);
    
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
    
      const handleUserAliasChange = (id: string, newAlias: string) => {
        setUsers(currentUsers =>
          currentUsers.map(u =>
            u.id === id ? { ...u, display_name: newAlias } : u
          )
        );
      };
    
      const handleSave = async () => {
        setIsLoading(true)
        try {
          const settingsPayload = {
            competition_name: competitionName,
            target_points: parseInt(targetPoints),
            z1: parseInt(z1),
            z2: parseInt(z2),
            z3: parseInt(z3),
            start_date: startDate,
            end_date: endDate,
            prize_pool_adjustment: parseInt(prizePoolAdjustment),
          };
    
          const usersPayload = {
            users: users.map(u => ({ id: u.id, display_name: u.display_name })),
          };
    
          // Perform both API calls
          const [settingsResponse, usersResponse] = await Promise.all([
            fetch('/api/admin/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(settingsPayload),
            }),
            fetch('/api/users', { // You will create this new endpoint
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(usersPayload),
            })
          ]);
    
          if (!settingsResponse.ok || !usersResponse.ok) {
            const settingsError = !settingsResponse.ok ? await settingsResponse.json() : null;
            const usersError = !usersResponse.ok ? await usersResponse.json() : null;
            throw new Error(settingsError?.error || usersError?.error || 'Failed to update settings or users');
          }
    
          toast({
            title: "Settings saved",
            description: "App settings and user aliases have been updated.",
          });
    
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Could not save settings. Check console.";
          toast({
            title: "Error",
            description: message,
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
            <div className="space-y-6">
              {/* App Settings Section */}
              <div className="space-y-4 border-b pb-6">
                <div className="space-y-2">
                  <Label htmlFor="competition-name">Competition Name</Label>
                  <Input id="competition-name" value={competitionName} onChange={(e) => setCompetitionName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target-points">Target Points (Weekly Fail Threshold)</Label>
                  <Input id="target-points" type="number" value={targetPoints} onChange={(e) => setTargetPoints(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prize-pool-adjustment">Prize Pool Adjustment</Label>
                  <Input id="prize-pool-adjustment" type="number" value={prizePoolAdjustment} onChange={(e) => setPrizePoolAdjustment(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2"><Label htmlFor="z1">Z1</Label><Input id="z1" type="number" value={z1} onChange={(e) => setZ1(e.target.value)} /></div>
                  <div className="space-y-2"><Label htmlFor="z2">Z2</Label><Input id="z2" type="number" value={z2} onChange={(e) => setZ2(e.target.value)} /></div>
                  <div className="space-y-2"><Label htmlFor="z3">Z3</Label><Input id="z3" type="number" value={z3} onChange={(e) => setZ3(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="start-date">Start Date</Label><Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                  <div className="space-y-2"><Label htmlFor="end-date">End Date</Label><Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
                </div>
              </div>
    
              {/* User Alias Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">User Aliases</h3>
                <div className="space-y-2">
                  {users.map((user) => (
                    <div key={user.id} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <Label>{user.id}</Label>
                      <Input
                        value={user.display_name || ''}
                        onChange={(e) => handleUserAliasChange(user.id, e.target.value)}
                        placeholder="Set display name"
                      />
                    </div>
                  ))}
                </div>
              </div>
    
              <Button onClick={handleSave} disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save All Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }
    