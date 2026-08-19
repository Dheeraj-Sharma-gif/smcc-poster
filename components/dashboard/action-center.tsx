"use client";
import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLATFORMS, type PlatformId } from "@/lib/config";
import { cn } from "@/lib/utils";

export interface ActionItem {
  text: string;
  platform?: PlatformId;
  priority: "high" | "medium" | "low";
}

export function ActionCenter({ items }: { items: ActionItem[] }) {
  const [done, setDone] = useState<Record<number, boolean>>({});
  const completed = Object.values(done).filter(Boolean).length;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Today&apos;s Action Center</CardTitle>
        <Badge variant="muted">
          {completed}/{items.length} done
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item, i) => {
          const isDone = done[i];
          return (
            <button
              key={i}
              onClick={() => setDone((d) => ({ ...d, [i]: !d[i] }))}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                isDone && "opacity-50"
              )}
            >
              {isDone ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" /> : <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />}
              <div className="min-w-0 flex-1">
                <span className={cn("text-sm", isDone && "line-through")}>{item.text}</span>
              </div>
              <span
                className={cn(
                  "mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                  item.priority === "high" && "bg-danger/15 text-danger",
                  item.priority === "medium" && "bg-warning/15 text-warning",
                  item.priority === "low" && "bg-muted text-muted-foreground"
                )}
              >
                {item.priority}
              </span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
