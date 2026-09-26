import type { Difficulty } from "@/lib/catalog/types";

/** Three frets: how many are lit says how hard the piece is. */
export default function DifficultyMeter({ level, label }: { level: Difficulty; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-sand-300" title={label}>
      <span className="flex items-end gap-[3px]" aria-hidden>
        {[1, 2, 3].map((step) => (
          <span
            key={step}
            className={`w-[5px] rounded-[1px] ${step <= level ? "bg-brass-400" : "bg-walnut-600"}`}
            style={{ height: 5 + step * 3 }}
          />
        ))}
      </span>
      {label}
    </span>
  );
}
