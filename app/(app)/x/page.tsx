import { redirect } from "next/navigation";

// X (Twitter) was removed from the dashboard (X API is paid-only for reads).
export default function Page() {
  redirect("/dashboard");
}
