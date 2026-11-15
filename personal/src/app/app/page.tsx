import type { ComponentProps } from "react";
import { BackOffice } from "@/components/BackOffice";
import { ensurePersoServerSession } from "@/lib/perso-session";
import { loadWorkspaceForUser } from "@/lib/workspace-data";

export const dynamic = "force-dynamic";

export default async function PersonalAppPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const user = await ensurePersoServerSession();
  const initialWorkspace = user ? await loadWorkspaceForUser(user) : undefined;

  return (
    <BackOffice
      initialTab={params.tab}
      initialWorkspace={
        initialWorkspace as ComponentProps<typeof BackOffice>["initialWorkspace"]
      }
    />
  );
}