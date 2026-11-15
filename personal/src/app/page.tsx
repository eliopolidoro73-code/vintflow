import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PersonalHomePage() {
  redirect("/api/auth/bootstrap");
}