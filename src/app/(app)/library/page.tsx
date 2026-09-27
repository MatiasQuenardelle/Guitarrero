import type { Metadata } from "next";
import { Suspense } from "react";
import LibraryView from "@/components/app/LibraryView";
import { ownerUser } from "@/lib/auth/owner";
import { authEnabled } from "@/lib/auth/server";
import { listLibrary } from "@/lib/catalog/server";

export const metadata: Metadata = { title: "Estudio" };

export default async function LibraryPage() {
  // Private pieces only for the owner, whatever the layout does alongside (see piece/[slug]).
  const owner = !authEnabled || Boolean(await ownerUser());
  const pieces = (await listLibrary()).filter((piece) => owner || !piece.private);
  return (
    <Suspense>
      <LibraryView pieces={pieces} />
    </Suspense>
  );
}
