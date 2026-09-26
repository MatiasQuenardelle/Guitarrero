import { Suspense } from "react";
import AppShell from "@/components/app/AppShell";
import { ProgressProvider } from "@/components/app/ProgressProvider";
import { isAdmin } from "@/lib/admin";
import { authEnabled } from "@/lib/auth/server";
import { requireOwner } from "@/lib/auth/owner";

// Every page here depends on who is signed in, and only the owner gets in.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOwner();

  return (
    <ProgressProvider signedIn={Boolean(user)} accounts={authEnabled}>
      <Suspense>
        <AppShell user={user} admin={isAdmin} accounts={authEnabled}>
          {children}
        </AppShell>
      </Suspense>
    </ProgressProvider>
  );
}
