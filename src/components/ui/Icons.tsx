/** Hand-drawn 24px stroke icons, sized by the caller. */
type IconProps = { className?: string };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const PlayIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M8 5.4v13.2a.8.8 0 0 0 1.2.7l10.4-6.6a.8.8 0 0 0 0-1.4L9.2 4.7A.8.8 0 0 0 8 5.4z" />
  </svg>
);

export const PauseIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <rect x="6.5" y="5" width="4" height="14" rx="1" />
    <rect x="13.5" y="5" width="4" height="14" rx="1" />
  </svg>
);

export const StopIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <rect x="6" y="6" width="12" height="12" rx="1.5" />
  </svg>
);

export const MetronomeIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
    <path d="M9.2 3.5h5.6l4 16.5H5.2z" />
    <path d="M12 16.5 17.5 6" />
    <path d="M7 16.5h10" />
  </svg>
);

export const CountInIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
    <circle cx="12" cy="13" r="7.5" />
    <path d="M12 9v4l2.5 1.5" />
    <path d="M10 3h4" />
  </svg>
);

export const LoopIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
    <path d="M17 2.5 20 5.5l-3 3" />
    <path d="M4 11.5v-1a5 5 0 0 1 5-5h11" />
    <path d="M7 21.5 4 18.5l3-3" />
    <path d="M20 12.5v1a5 5 0 0 1-5 5H4" />
  </svg>
);

export const ExpandIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
);

export const CollapseIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
    <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
  </svg>
);

export const MinusIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={2} aria-hidden>
    <path d="M5 12h14" />
  </svg>
);

export const PlusIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={2} aria-hidden>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const StarIcon = ({ className = "h-5 w-5", filled = false }: IconProps & { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} fill={filled ? "currentColor" : "none"} aria-hidden>
    <path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />
  </svg>
);

export const LibraryIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
    <path d="M4 4.5h4v15H4zM10 4.5h4v15h-4z" />
    <path d="m16.2 5.4 3.8-1 3 14.5-3.8 1z" transform="translate(-1.6 0)" />
  </svg>
);

export const ReaderIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
    <path d="M5 3.5h10l4 4v13H5z" />
    <path d="M14.5 3.5v4.5H19" />
    <path d="M8 12h8M8 15h8M8 18h5" />
  </svg>
);

export const SearchIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
);

export const ArrowLeftIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);

export const ArrowRightIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const SlidersIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </svg>
);

export const LogoutIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
    <path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9" />
  </svg>
);

export const TuningIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
    <path d="M6 20V9M10 20V6M14 20V6M18 20V9" />
    <circle cx="6" cy="6" r="1.8" />
    <circle cx="18" cy="6" r="1.8" />
  </svg>
);

export const CloseIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
