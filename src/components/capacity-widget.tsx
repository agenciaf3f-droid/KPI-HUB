import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { TeamMemberCapacity } from "@/lib/types";

export function CapacityWidget({ members }: { members: TeamMemberCapacity[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {members.map((m) => {
        const pct = Math.min(100, Math.round((m.committedPoints / m.weeklyCapacityPoints) * 100));
        const over = m.committedPoints > m.weeklyCapacityPoints;
        return (
          <Card key={m.userId} className="rounded-[1.5rem] border-0 bg-muted shadow-none">
            <CardContent className="flex flex-col gap-3 px-5 py-5">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold tracking-[-0.02em] text-foreground">{m.name}</span>
                <span className={over ? "rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive" : "rounded-full bg-card px-2.5 py-1 text-xs text-muted-foreground"}>
                  {over ? "sobrecarga" : `${100 - pct}% livre`}
                </span>
              </div>
              <Progress value={pct} className={over ? "h-2 bg-card [&>div]:bg-destructive" : "h-2 bg-card [&>div]:bg-primary"} />
              <span className="text-xs text-muted-foreground">
                {m.committedPoints} / {m.weeklyCapacityPoints} pts · {m.committedHours}h / {m.weeklyCapacityHours}h
              </span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
