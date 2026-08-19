"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, formatPercent } from "@/lib/utils";

export interface KpiCardProps {
  label: string;
  /** Pre-formatted value string (formatting happens on the server — RSC-safe). */
  display: string;
  /** Pass a rendered icon element (not a component) — RSC-safe. */
  icon: React.ReactNode;
  changePct?: number;
  accent?: string;
  index?: number;
}

export function KpiCard({ label, display, icon, changePct, accent, index = 0 }: KpiCardProps) {
  const dir = changePct === undefined ? "flat" : changePct > 0.5 ? "up" : changePct < -0.5 ? "down" : "flat";
  const TrendIcon = dir === "up" ? TrendingUp : dir === "down" ? TrendingDown : Minus;
  const color = accent || "hsl(var(--primary))";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 22, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <Card className="relative overflow-hidden p-5 transition-shadow duration-300 group-hover:shadow-xl group-hover:shadow-black/10 group-hover:ring-1 group-hover:ring-border">
        <div className="absolute -right-6 -top-6 size-24 rounded-full opacity-20 blur-2xl" style={{ background: color }} />
        <div className="flex items-start justify-between">
          <div className="grid size-10 place-items-center rounded-xl [&_svg]:size-5" style={{ background: `${color}20`, color }}>
            {icon}
          </div>
          {changePct !== undefined && (
            <div
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                dir === "up" && "bg-success/15 text-success",
                dir === "down" && "bg-danger/15 text-danger",
                dir === "flat" && "bg-muted text-muted-foreground"
              )}
            >
              <TrendIcon className="size-3" />
              {formatPercent(changePct)}
            </div>
          )}
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold tracking-tight tabular-nums">{display}</div>
          <div className="mt-0.5 text-sm text-muted-foreground">{label}</div>
        </div>
      </Card>
    </motion.div>
  );
}
