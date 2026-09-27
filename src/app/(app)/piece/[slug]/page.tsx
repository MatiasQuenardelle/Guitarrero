import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PieceView from "@/components/app/PieceView";
import { ownerUser } from "@/lib/auth/owner";
import { authEnabled } from "@/lib/auth/server";
import { findPiece } from "@/lib/catalog/server";

/**
 * The layout already sends everyone but the owner to /login, but it renders alongside this
 * page, so a private piece checks for itself before anything of it is sent.
 */
async function visiblePiece(slug: string) {
  const piece = await findPiece(slug);
  if (piece?.private && authEnabled && !(await ownerUser())) return null;
  return piece;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const piece = await visiblePiece((await params).slug);
  return piece ? { title: `${piece.title.es} — ${piece.composer}` } : {};
}

export default async function PiecePage({ params }: { params: Promise<{ slug: string }> }) {
  const piece = await visiblePiece((await params).slug);
  if (!piece) notFound();

  const { alphaTex, ...meta } = piece;
  return <PieceView key={meta.slug} piece={meta} alphaTex={alphaTex} />;
}
