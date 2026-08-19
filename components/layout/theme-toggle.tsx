"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

const ORDER = ["dark", "light", "system"] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <Button variant="ghost" size="icon" aria-label="Toggle theme" />;

  const current = (theme as (typeof ORDER)[number]) || "dark";
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const Icon = current === "light" ? Sun : current === "system" ? Monitor : Moon;

  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" title={`Theme: ${current}`} onClick={() => setTheme(next)}>
      <Icon />
    </Button>
  );
}
