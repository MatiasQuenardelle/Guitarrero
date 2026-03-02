"use client";

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
}

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
}: ViewerToolbarProps) {
  return (
    <div className="no-print flex flex-wrap items-center gap-4 mb-4 p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-sm">
      {/* Font Size */}
      <div className="flex items-center gap-2">
        <span className="text-zinc-400 text-xs uppercase tracking-wide">Size</span>
        <button
          onClick={() => onFontSizeChange(Math.max(10, fontSize - 1))}
          className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          −
        </button>
        <span className="text-zinc-300 w-6 text-center">{fontSize}</span>
        <button
          onClick={() => onFontSizeChange(Math.min(24, fontSize + 1))}
          className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          +
        </button>
      </div>

      <div className="w-px h-6 bg-zinc-700" />

      {/* Transpose */}
      <div className="flex items-center gap-2">
        <span className="text-zinc-400 text-xs uppercase tracking-wide">Transpose</span>
        <button
          onClick={() => onTransposeChange(transposeAmount - 1)}
          className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          −
        </button>
        <span className={`w-6 text-center ${transposeAmount === 0 ? "text-zinc-500" : "text-amber-400"}`}>
          {transposeAmount > 0 ? `+${transposeAmount}` : transposeAmount}
        </span>
        <button
          onClick={() => onTransposeChange(transposeAmount + 1)}
          className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          +
        </button>
        {transposeAmount !== 0 && (
          <button
            onClick={() => onTransposeChange(0)}
            className="text-xs text-zinc-500 hover:text-amber-400 transition-colors"
          >
            reset
          </button>
        )}
      </div>

      <div className="w-px h-6 bg-zinc-700" />

      {/* Auto-scroll */}
      <div className="flex items-center gap-2">
        <button
          onClick={onScrollToggle}
          className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
            isScrolling
              ? "bg-amber-500 text-zinc-900"
              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          }`}
          title={isScrolling ? "Pause scroll" : "Start scroll"}
        >
          {isScrolling ? "⏸" : "▶"}
        </button>
        <input
          type="range"
          min="0.5"
          max="5"
          step="0.5"
          value={scrollSpeed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="w-20 accent-amber-500"
        />
        <span className="text-zinc-500 text-xs">{scrollSpeed}x</span>
      </div>

      <div className="w-px h-6 bg-zinc-700" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          className="px-3 py-1.5 text-xs rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-amber-400 transition-colors"
        >
          Save
        </button>
        <button
          onClick={onPrint}
          className="px-3 py-1.5 text-xs rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-amber-400 transition-colors"
        >
          Print
        </button>
      </div>
    </div>
  );
}
