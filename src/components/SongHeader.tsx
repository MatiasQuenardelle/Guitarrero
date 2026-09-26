"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { transposeNote } from "@/lib/chords";

interface SongHeaderProps {
  title: string;
  artist: string;
  capo: string;
  songKey: string;
  transposeAmount?: number;
}

export default function SongHeader({ title, artist, capo, songKey, transposeAmount = 0 }: SongHeaderProps) {
  const { t } = useI18n();
  if (!(title || artist || capo || songKey)) return null;

  const displayKey = songKey && transposeAmount !== 0 ? transposeNote(songKey, transposeAmount) : songKey;

  return (
    <div className="mb-6">
      {title && <h1 className="font-display text-5xl font-medium leading-tight text-cream-50">{title}</h1>}
      {artist && <p className="mt-1 text-lg text-sand-400">{artist}</p>}
      <div className="mt-3 flex gap-5 text-sm text-sand-500">
        {songKey && (
          <span>
            {t.reader.key}: <span className="font-mono text-brass-300">{displayKey}</span>
            {transposeAmount !== 0 && (
              <span className="ml-1 text-sand-600">
                ({t.reader.original} {songKey})
              </span>
            )}
          </span>
        )}
        {capo && (
          <span>
            {t.reader.capo}: <span className="font-mono text-brass-300">{capo}</span>
          </span>
        )}
      </div>
    </div>
  );
}
