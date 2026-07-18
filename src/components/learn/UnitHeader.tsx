import type { Unit } from "@/lib/learn/types";

interface UnitHeaderProps {
  unit: Unit;
  index: number;
  completedCount: number;
}

export default function UnitHeader({ unit, index, completedCount }: UnitHeaderProps) {
  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
        Unit {index + 1}
      </p>
      <h2 className="mt-1 text-xl font-bold text-zinc-100">{unit.title}</h2>
      <p className="mt-1 text-sm text-zinc-400">{unit.description}</p>
      <p className="mt-3 text-xs font-medium text-zinc-500">
        {completedCount} / {unit.lessons.length} lessons completed
      </p>
    </div>
  );
}
