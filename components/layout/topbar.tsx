"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Menu, RefreshCw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { NotificationsBell } from "./notifications-bell";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export function Topbar({
  title,
  onMenu,
  adminName = "Admin",
  adminInitials = "A",
}: {
  title: string;
  onMenu: () => void;
  adminName?: string;
  adminInitials?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [syncing, setSyncing] = useState(false);

  async function refresh() {
    setSyncing(true);
    try {
      await fetch("/api/sync", { method: "POST" });
    } catch {}
    startTransition(() => router.refresh());
    setTimeout(() => setSyncing(false), 800);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    // also clear the client-side Supabase session so Google doesn't auto-resume
    await getBrowserSupabase().auth.signOut().catch(() => {});
    router.replace("/login");
  }

  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border px-4 lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Menu">
        <Menu />
      </Button>
      <div>
        <h1 className="text-lg font-semibold leading-tight">{title}</h1>
        <p className="hidden text-xs text-muted-foreground sm:block">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Button variant="secondary" size="sm" onClick={refresh} disabled={syncing || pending}>
          <RefreshCw className={syncing || pending ? "animate-spin" : ""} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
        <NotificationsBell />
        <ThemeToggle />
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <div className="hidden items-center gap-2 sm:flex" title={`${adminName} · Administrator`}>
          <div className="grid size-8 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
            {adminInitials}
          </div>
          <div className="leading-tight">
            <div className="text-sm font-medium">{adminName}</div>
            <div className="text-[11px] text-muted-foreground">Administrator</div>
          </div>
        </div>
        <Button variant="ghost" size="icon" aria-label="Log out" onClick={logout}>
          <LogOut />
        </Button>
      </div>
    </header>
  );
}
