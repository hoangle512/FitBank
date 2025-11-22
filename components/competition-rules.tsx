import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Info } from "lucide-react"

export function CompetitionRules() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          <CardTitle>Competition Rules</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div>
            <h4 className="font-semibold text-foreground mb-1">1. Participation</h4>
            <p>
              All participants must register with a valid username and maintain accurate heart rate data throughout the
              competition period.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">2. Scoring</h4>
            <p>
              Points are awarded based on heart rate readings. Consistent monitoring and achieving target zones will
              earn you more points. Coins are earned at a rate of 1 coin per 10 points.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">3. Fails</h4>
            <p>
              Fails are recorded when heart rate readings are outside the acceptable range or when data submission
              errors occur. Excessive fails may result in point deductions.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">4. Winner Selection</h4>
            <p>
              The winner is determined by the highest total points at the end of the competition period. In case of a
              tie, the participant with fewer fails wins.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">5. Prize Distribution</h4>
            <p>
              Prize pool will be distributed among the top 3 participants: 1st place (50%), 2nd place (30%), 3rd place
              (20%).
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
