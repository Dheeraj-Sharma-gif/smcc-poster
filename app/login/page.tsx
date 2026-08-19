import { redirect } from "next/navigation";

export default async function LoginPage() {
  // Direct access - skip login
  redirect("/dashboard");
}
