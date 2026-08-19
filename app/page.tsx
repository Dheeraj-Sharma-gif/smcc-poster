import { redirect } from "next/navigation";

export default async function Home() {
  // Direct access - skip login
  redirect("/dashboard");
}
