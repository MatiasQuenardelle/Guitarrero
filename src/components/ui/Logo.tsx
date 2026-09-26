/** A guitar's soundhole and rosette: rings of purfling around a mosaic band. */
export function Rosette({ className = "h-8 w-8" }: { className?: string }) {
  const tiles = Array.from({ length: 28 }, (_, i) => (i * 360) / 28);
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle cx="24" cy="24" r="23" fill="#2a1d15" stroke="#d3aa63" strokeWidth="1" />
      <circle cx="24" cy="24" r="20.5" fill="none" stroke="#976f31" strokeWidth="0.6" />
      <g>
        {tiles.map((angle, i) => (
          <rect
            key={angle}
            x="23.1"
            y="5.2"
            width="1.8"
            height="3.4"
            rx="0.4"
            fill={i % 2 ? "#e3c58c" : "#a9774f"}
            transform={`rotate(${angle} 24 24)`}
          />
        ))}
      </g>
      <circle cx="24" cy="24" r="14.6" fill="none" stroke="#976f31" strokeWidth="0.6" />
      <circle cx="24" cy="24" r="13.2" fill="#0d0806" stroke="#d3aa63" strokeWidth="0.9" />
      {/* Strings crossing the soundhole. */}
      {[-5, -3, -1, 1, 3, 5].map((x, i) => (
        <line
          key={x}
          x1={24 + x}
          x2={24 + x}
          y1="10.8"
          y2="37.2"
          stroke="#efdcb4"
          strokeOpacity={0.55 + i * 0.05}
          strokeWidth={0.35 + (5 - i) * 0.06}
        />
      ))}
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Rosette className="h-8 w-8 shrink-0" />
      <span className="font-display text-[1.55rem] font-semibold leading-none tracking-wide text-cream-50">
        Guitarrero
      </span>
    </span>
  );
}
