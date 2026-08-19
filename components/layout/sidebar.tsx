"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileBarChart,
  Sparkles,
  Settings,
  Wand2,
  Columns3,
  Swords,
  Inbox,
  Globe,
} from "lucide-react";
import { PLATFORMS, PLATFORM_IDS, APP } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

const NAV_MAIN = [{ href: "/dashboard", label: "Home", icon: Home }];
const NAV_TOOLS = [
  { href: "/studio", label: "Content Studio", icon: Wand2 },
  { href: "/compare", label: "Compare", icon: Columns3 },
  { href: "/competitors", label: "Competitors", icon: Swords },
  { href: "/inbox", label: "Inbox", icon: Inbox },
];
const NAV_BOTTOM = [
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/insights", label: "AI Insights", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  onNavigate,
  adminName = "Admin",
  adminInitials = "A",
}: {
  onNavigate?: () => void;
  adminName?: string;
  adminInitials?: string;
}) {
  const pathname = usePathname();

  const Item = ({ href, label, icon: Icon, color }: { href: string; label: string; icon: any; color?: string }) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        onClick={onNavigate}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
          active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        )}
      >
        <Icon className="size-[18px] shrink-0" style={color ? { color } : undefined} />
        <span>{label}</span>
        {active && <span className="ml-auto size-1.5 rounded-full bg-primary" />}
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="mb-4 flex items-center gap-2.5 px-2">
        <div className="grid size-9 place-items-center">
          <Logo className="size-9" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">{APP.short}</div>
          <div className="text-[11px] text-muted-foreground">Command Center</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_MAIN.map((n) => (
          <Item key={n.href} {...n} />
        ))}

        <div className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Platforms
        </div>
        {PLATFORM_IDS.map((id) => (
          <Item key={id} href={`/${id}`} label={PLATFORMS[id].short} icon={PLATFORMS[id].icon} color={PLATFORMS[id].color} />
        ))}
        <Item href="/website" label="Website" icon={Globe} color="#0ea5e9" />

        <div className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Tools
        </div>
        {NAV_TOOLS.map((n) => (
          <Item key={n.href} {...n} />
        ))}

        <div className="mt-4 border-t border-border pt-3">
          {NAV_BOTTOM.map((n) => (
            <Item key={n.href} {...n} />
          ))}
        </div>
      </nav>

      <div className="mt-auto space-y-2">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">
            {adminInitials}
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold">{adminName}</div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className="live-dot size-1.5 rounded-full bg-success" />
              Administrator
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
