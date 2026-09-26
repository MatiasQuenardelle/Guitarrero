import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PieceView from "@/components/app/PieceView";
import { getPiece } from "@/lib/catalog/server";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const piece = getPiece((await params).slug);
  return piece ? { title: `${piece.title.es} — ${piece.composer}` } : {};
}

export default async function PiecePage({ params }: { params: Promise<{ slug: string }> }) {
  const piece = getPiece((await params).slug);
  if (!piece) notFound();

  const { alphaTex, ...meta } = piece;
  return <PieceView key={meta.slug} piece={meta} alphaTex={alphaTex} />;
}
