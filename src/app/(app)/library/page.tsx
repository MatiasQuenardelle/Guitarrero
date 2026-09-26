import type { Metadata } from "next";
import { Suspense } from "react";
import LibraryView from "@/components/app/LibraryView";
import { listPieces } from "@/lib/catalog/server";

export const metadata: Metadata = { title: "Estudio" };

export default function LibraryPage() {
  return (
    <Suspense>
      <LibraryView pieces={listPieces()} />
    </Suspense>
  );
}
