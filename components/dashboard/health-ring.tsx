"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function HealthRing({ score, breakdown }: { score: number; breakdown: { label: string; value: number; weight: number }[] }) {
  const radius = 64;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score));
  const color = pct >= 75 ? "hsl(var(--success))" : pct >= 50 ? "hsl(var(--warning))" : "hsl(var(--danger))";
  const label = pct >= 75 ? "Excellent" : pct >= 50 ? "Good" : "Needs work";

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div className="relative shrink-0" style={{ width: 160, height: 160 }}>
        <svg width={160} height={160} className="-rotate-90">
          <circle cx={80} cy={80} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={12} />
          <motion.circle
            cx={80}
            cy={80}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold tabular-nums">{score}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>

      <div className="w-full space-y-2.5">
        <div className="text-sm font-medium" style={{ color }}>
          {label}
        </div>
        {breakdown.map((b) => (
          <div key={b.label}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-muted-foreground">{b.label}</span>
              <span className="tabular-nums">{Math.round(b.value)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                className={cn("h-full rounded-full")}
                style={{ background: color }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, b.value)}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
