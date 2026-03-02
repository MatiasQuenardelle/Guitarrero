"use client";

import { transposeNote } from "@/lib/chords";

interface SongHeaderProps {
  title: string;
  artist: string;
  capo: string;
  songKey: string;
  transposeAmount?: number;
}

export default function SongHeader({
  title,
  artist,
  capo,
  songKey,
  transposeAmount = 0,
}: SongHeaderProps) {
  const hasMetadata = title || artist || capo || songKey;

  if (!hasMetadata) return null;

  const displayKey =
    songKey && transposeAmount !== 0
      ? transposeNote(songKey, transposeAmount)
      : songKey;

  return (
    <div className="mb-6">
      {title && (
        <h1 className="text-2xl font-bold text-zinc-100">{title}</h1>
      )}
      {artist && (
        <p className="text-lg text-zinc-400 mt-1">{artist}</p>
      )}
      <div className="flex gap-4 mt-2">
        {songKey && (
          <span className="text-sm text-zinc-500">
            Key: <span className="text-amber-400">{displayKey}</span>
            {transposeAmount !== 0 && (
              <span className="text-zinc-600 ml-1">(orig: {songKey})</span>
            )}
          </span>
        )}
        {capo && (
          <span className="text-sm text-zinc-500">
            Capo: <span className="text-amber-400">{capo}</span>
          </span>
        )}
      </div>
    </div>
  );
}
