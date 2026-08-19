"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, TrendingUp, TrendingDown, Award, AlertTriangle, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface N {
  id: string;
  type: string;
  title: string;
  body: string;
  severity: "info" | "success" | "warning";
  platform?: string | null;
}

const ICONS: Record<string, any> = {
  milestone: Award,
  reach_up: TrendingUp,
  reach_down: TrendingDown,
  low_frequency: AlertTriangle,
  top_content: Flame,
};

export function NotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<N[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notifications", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.notifications || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const visible = items.filter((n) => !dismissed.has(n.id));
  const unread = visible.length;

  function handleClick(n: N) {
    if (n.platform) router.push(`/${n.platform}`);
    setDismissed((s) => new Set(s).add(n.id));
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="icon" aria-label="Notifications" onClick={() => setOpen((o) => !o)}>
        <Bell />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-danger text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <>
            {/* Mobile backdrop so the panel reads as a sheet and taps close it */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/30 sm:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="fixed left-3 right-3 top-16 z-50 overflow-hidden rounded-xl border border-border bg-card p-2 shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80"
            >
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-sm font-semibold">Notifications</span>
                {visible.length > 0 && (
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setDismissed(new Set(items.map((i) => i.id)))}
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="max-h-[70vh] space-y-1 overflow-y-auto sm:max-h-96">
                {visible.length === 0 && (
                  <div className="px-2 py-8 text-center text-sm text-muted-foreground">You&apos;re all caught up.</div>
                )}
                {visible.map((n) => {
                  const Icon = ICONS[n.type] || Bell;
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className="flex w-full gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60 active:bg-muted"
                    >
                      <div
                        className={cn(
                          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg",
                          n.severity === "success" && "bg-success/15 text-success",
                          n.severity === "warning" && "bg-warning/15 text-warning",
                          n.severity === "info" && "bg-primary/15 text-primary"
                        )}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{n.title}</div>
                        <div className="text-xs text-muted-foreground">{n.body}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
