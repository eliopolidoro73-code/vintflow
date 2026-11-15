import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { PersonalEntry } from "@/components/PersonalEntry";

export const dynamic = "force-dynamic";

export default async function PersonalHomePage() {
  const user = await getAuthenticatedUser();
  if (user) {
    redirect("/app");
  }
  return <PersonalEntry />;
}