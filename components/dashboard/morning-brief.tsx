"use client";
import { motion } from "framer-motion";
import { Sparkles, Sun } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function MorningBrief({ text, usedModel }: { text: string; usedModel: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="relative overflow-hidden p-6">
        <div className="absolute -right-8 -top-8 size-32 rounded-full bg-warning/20 blur-3xl" />
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-warning/15 text-warning">
            <Sun className="size-5" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Morning Brief</h3>
            <Badge variant={usedModel ? "default" : "muted"}>
              <Sparkles className="size-3" />
              {usedModel ? "AI" : "Auto"}
            </Badge>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">{text}</p>
      </Card>
    </motion.div>
  );
}
