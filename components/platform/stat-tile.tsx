import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function StatTile({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  accent?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {Icon && <Icon className="size-3.5" style={accent ? { color: accent } : undefined} />}
        {label}
      </div>
      <div className="mt-1.5 text-xl font-bold tabular-nums">{value}</div>
    </Card>
  );
}
