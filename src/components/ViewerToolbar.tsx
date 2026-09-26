"use client";

import { ExpandIcon, MinusIcon, PauseIcon, PlayIcon, PlusIcon } from "@/components/ui/Icons";
import { useI18n } from "@/i18n/I18nProvider";

interface ViewerToolbarProps {
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  transposeAmount: number;
  onTransposeChange: (amount: number) => void;
  isScrolling: boolean;
  scrollSpeed: number;
  onScrollToggle: () => void;
  onSpeedChange: (speed: number) => void;
  onPrint: () => void;
  onSave: () => void;
  saved: boolean;
  onStage: () => void;
}

function Stepper({
  label,
  value,
  onDown,
  onUp,
  highlight,
}: {
  label: string;
  value: string;
  onDown: () => void;
  onUp: () => void;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sand-500">{label}</span>
      <div className="flex items-center rounded-full border border-walnut-600 bg-walnut-950/60">
        <button onClick={onDown} aria-label={`${label} −`} className="flex h-8 w-8 items-center justify-center text-sand-300 hover:text-cream-50">
          <MinusIcon className="h-3.5 w-3.5" />
        </button>
        <span className={`w-7 text-center font-mono text-[13px] ${highlight ? "text-brass-300" : "text-cream-100"}`}>
          {value}
        </span>
        <button onClick={onUp} aria-label={`${label} +`} className="flex h-8 w-8 items-center justify-center text-sand-300 hover:text-cream-50">
          <PlusIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

const Divider = () => <span className="hidden h-6 w-px bg-walnut-600 sm:block" aria-hidden />;

export default function ViewerToolbar({
  fontSize,
  onFontSizeChange,
  transposeAmount,
  onTransposeChange,
  isScrolling,
  scrollSpeed,
  onScrollToggle,
  onSpeedChange,
  onPrint,
  onSave,
  saved,
  onStage,
}: ViewerToolbarProps) {
  const { t } = useI18n();

  return (
    <div className="no-print wood sticky top-16 z-20 mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl px-4 py-3 ring-1 ring-brass-400/20 lg:top-4">
      <Stepper
        label={t.reader.size}
        value={String(fontSize)}
        onDown={() => onFontSizeChange(Math.max(10, fontSize - 1))}
        onUp={() => onFontSizeChange(Math.min(28, fontSize + 1))}
      />
      <Divider />
      <Stepper
        label={t.reader.transpose}
        value={transposeAmount > 0 ? `+${transposeAmount}` : String(transposeAmount)}
        onDown={() => onTransposeChange(transposeAmount - 1)}
        onUp={() => onTransposeChange(transposeAmount + 1)}
        highlight={transposeAmount !== 0}
      />
      {transposeAmount !== 0 && (
        <button onClick={() => onTransposeChange(0)} className="text-xs text-sand-500 hover:text-brass-300">
          {t.reader.reset}
        </button>
      )}
      <Divider />
      <div className="flex items-center gap-2">
        <button
          onClick={onScrollToggle}
          aria-label={t.reader.scroll}
          title={`${t.reader.scroll} (Space)`}
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
            isScrolling
              ? "bg-gradient-to-b from-brass-300 to-brass-500 text-walnut-950"
              : "border border-walnut-600 text-sand-300 hover:text-cream-50"
          }`}
        >
          {isScrolling ? <PauseIcon className="h-3.5 w-3.5" /> : <PlayIcon className="ml-0.5 h-3.5 w-3.5" />}
        </button>
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sand-500">{t.reader.scroll}</span>
        <input
          type="range"
          min="0.5"
          max="5"
          step="0.5"
          value={scrollSpeed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          aria-label={t.reader.scroll}
          className="w-20 accent-brass-400"
        />
        <span className="w-8 font-mono text-xs text-sand-500">{scrollSpeed}x</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button onClick={onSave} className="h-8 rounded-full px-3 text-[13px] text-sand-300 hover:bg-walnut-700/70 hover:text-cream-50">
          {saved ? `✓ ${t.reader.savedOk}` : t.reader.save}
        </button>
        <button onClick={onPrint} className="hidden h-8 rounded-full px-3 text-[13px] text-sand-300 hover:bg-walnut-700/70 hover:text-cream-50 sm:block">
          {t.reader.print}
        </button>
        <button
          onClick={onStage}
          className="flex h-8 items-center gap-2 rounded-full bg-brass-400/15 px-3.5 text-[13px] font-medium text-brass-300 ring-1 ring-inset ring-brass-400/40 hover:bg-brass-400/25"
        >
          <ExpandIcon className="h-4 w-4" />
          {t.reader.stage}
        </button>
      </div>
    </div>
  );
}
