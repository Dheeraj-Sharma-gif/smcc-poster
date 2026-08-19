import { WebsiteAnalytics } from "@/components/dashboard/website-analytics";

export const dynamic = "force-dynamic";

export default function WebsitePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Website Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Live visitors and traffic for Postr, straight from analytics.
        </p>
      </div>
      <WebsiteAnalytics />
    </div>
  );
}
