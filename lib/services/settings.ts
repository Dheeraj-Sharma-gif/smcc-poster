import { getSupabase } from "@/lib/supabase/client";

export interface AppSettings {
  theme: "dark" | "light" | "system";
  refresh_interval: number; // minutes; 0 = off
  notifications_enabled: boolean;
}

const DEFAULTS: AppSettings = {
  theme: "dark",
  refresh_interval: 10,
  notifications_enabled: true,
};

export async function getSettings(): Promise<AppSettings> {
  const db = getSupabase();
  if (!db) return DEFAULTS;
  const { data } = await db.from("app_settings").select("*").eq("id", 1).single();
  if (!data) return DEFAULTS;
  return {
    theme: data.theme ?? DEFAULTS.theme,
    refresh_interval: data.refresh_interval ?? DEFAULTS.refresh_interval,
    notifications_enabled: data.notifications_enabled ?? DEFAULTS.notifications_enabled,
  };
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const db = getSupabase();
  const current = await getSettings();
  const next = { ...current, ...patch };
  if (db) {
    await db.from("app_settings").upsert({ id: 1, ...next, updated_at: new Date().toISOString() });
  }
  return next;
}
