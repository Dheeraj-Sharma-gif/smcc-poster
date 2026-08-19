"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { PLATFORMS, PLATFORM_IDS, APP, type PlatformId } from "@/lib/config";
import { cn } from "@/lib/utils";

/** Short page name used for the browser tab title, e.g. "SMCC - WFYI Dashboard". */
function tabName(pathname: string): string {
  if (pathname.startsWith("/dashboard")) return "Home";
  if (pathname.startsWith("/website")) return "Website";
  if (pathname.startsWith("/reports")) return "Reports";
  if (pathname.startsWith("/insights")) return "AI Insights";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/studio")) return "Content Studio";
  if (pathname.startsWith("/compare")) return "Compare";
  if (pathname.startsWith("/competitors")) return "Competitors";
  if (pathname.startsWith("/inbox")) return "Inbox";
  const id = pathname.replace("/", "") as PlatformId;
  if (PLATFORM_IDS.includes(id)) return PLATFORMS[id].short;
  return "Dashboard";
}

function titleFor(pathname: string): string {
  if (pathname.startsWith("/dashboard")) return "Home";
  if (pathname.startsWith("/website")) return "Website Analytics";
  if (pathname.startsWith("/reports")) return "Reports";
  if (pathname.startsWith("/insights")) return "AI Insights";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/studio")) return "Content Studio";
  if (pathname.startsWith("/compare")) return "Compare Platforms";
  if (pathname.startsWith("/competitors")) return "Competitor Tracking";
  if (pathname.startsWith("/inbox")) return "Comments Inbox";
  const id = pathname.replace("/", "") as PlatformId;
  if (PLATFORM_IDS.includes(id)) return PLATFORMS[id].name;
  return "Mission Control";
}

export function AppShell({
  children,
  refreshInterval,
  adminName,
  adminInitials,
}: {
  children: React.ReactNode;
  refreshInterval: number; // minutes; 0 = off
  adminName: string;
  adminInitials: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-refresh
  useEffect(() => {
    if (!refreshInterval) return;
    const ms = refreshInterval * 60 * 1000;
    const t = setInterval(() => {
      fetch("/api/sync", { method: "POST" }).finally(() => router.refresh());
    }, ms);
    return () => clearInterval(t);
  }, [refreshInterval, router]);

  useEffect(() => setMobileOpen(false), [pathname]);

  // Per-page browser tab title, e.g. "SMCC - WFYI Dashboard".
  useEffect(() => {
    document.title = `${APP.short} - WFYI ${tabName(pathname)}`;
  }, [pathname]);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="glass sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border lg:block">
        <Sidebar adminName={adminName} adminInitials={adminInitials} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="drawer"
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="absolute left-0 top-0 h-full w-72 border-r border-border bg-card shadow-2xl"
            >
              <button
                className="absolute right-3 top-4 grid size-8 place-items-center rounded-md hover:bg-muted"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="size-4" />
              </button>
              <Sidebar onNavigate={() => setMobileOpen(false)} adminName={adminName} adminInitials={adminInitials} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={titleFor(pathname)} onMenu={() => setMobileOpen(true)} adminName={adminName} adminInitials={adminInitials} />
        <main className="w-full flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={cn("mx-auto w-full max-w-[1400px] p-4 lg:p-6")}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
