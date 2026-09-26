"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import type { Difficulty, Piece } from "@/lib/catalog/types";

const field =
  "h-10 w-full rounded-lg border border-walnut-600 bg-walnut-950 px-3 text-sm text-cream-100 outline-none focus:border-brass-400/60";

/**
 * Studio → library. Copies this project's current score into content/pieces/<slug>; commit
 * that folder to ship it. Publishing again refreshes the score of the same piece.
 */
export default function PublishPanel({
  projectId,
  suggestedTitle,
  published,
}: {
  projectId: string;
  suggestedTitle: string;
  published: Piece | null;
}) {
  const [slug, setSlug] = useState(published?.slug ?? "");
  const [titleEs, setTitleEs] = useState(published?.title.es ?? suggestedTitle);
  const [titleEn, setTitleEn] = useState(published?.title.en ?? suggestedTitle);
  const [composer, setComposer] = useState(published?.composer ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>(published?.difficulty ?? 2);
  const [state, setState] = useState<{ ok?: Piece; error?: string; busy?: boolean }>({});

  async function publish() {
    setState({ busy: true });
    const response = await fetch(`/api/projects/${projectId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, titleEs, titleEn, composer, difficulty }),
    });
    const data = (await response.json()) as { piece?: Piece; error?: string };
    setState(data.piece ? { ok: data.piece } : { error: data.error ?? "Failed" });
  }

  return (
    <section className="panel rounded-2xl p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl text-cream-50">Publish to the Studio</h2>
        {published && (
          <Link href={`/piece/${published.slug}`} className="text-sm text-brass-300 hover:underline">
            Published as /piece/{published.slug} · {published.publishedAt}
          </Link>
        )}
      </div>
      <p className="mt-1 text-xs text-sand-500">
        Writes content/pieces/&lt;slug&gt;/. Users only ever see what is published and committed.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-sand-400">
          Slug
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="lagrima" className={field} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-sand-400">
          Title (ES)
          <input value={titleEs} onChange={(e) => setTitleEs(e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-sand-400">
          Title (EN)
          <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-sand-400">
          Composer
          <input value={composer} onChange={(e) => setComposer(e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-sand-400">
          Difficulty
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value) as Difficulty)}
            className={field}
          >
            <option value={1}>1 · Early intermediate</option>
            <option value={2}>2 · Intermediate</option>
            <option value={3}>3 · Advanced</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={publish}
            disabled={!slug || state.busy}
            className={buttonClass("primary", "md", "w-full")}
          >
            {published ? "Publish again" : "Publish"}
          </button>
        </div>
      </div>

      {state.ok && (
        <p className="mt-3 text-sm text-sage-400">
          Published {state.ok.title.es} ({state.ok.bars} bars). Commit content/pieces/{state.ok.slug}/ to ship it.
        </p>
      )}
      {state.error && <p className="mt-3 text-sm text-rosewood-400">{state.error}</p>}
    </section>
  );
}
