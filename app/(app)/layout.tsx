import { redirect } from "next/navigation";
import { isAuthenticated, getUserName, getUserInitials } from "@/lib/auth";
import { getSettings } from "@/lib/services/settings";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthenticated())) redirect("/login");
  const settings = await getSettings();
  const adminName = await getUserName();
  const adminInitials = await getUserInitials();
  return (
    <AppShell refreshInterval={settings.refresh_interval} adminName={adminName} adminInitials={adminInitials}>
      {children}
    </AppShell>
  );
}
