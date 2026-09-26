type Variant = "primary" | "secondary" | "ghost" | "quiet";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-night disabled:pointer-events-none disabled:opacity-40 active:translate-y-px select-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-brass-300 to-brass-500 text-walnut-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_24px_-12px_rgba(211,170,99,0.7)] hover:from-brass-200 hover:to-brass-400",
  secondary:
    "border border-brass-400/35 bg-walnut-800/60 text-cream-100 hover:border-brass-400/70 hover:bg-walnut-700/70",
  ghost: "text-sand-300 hover:bg-walnut-700/60 hover:text-cream-50",
  quiet: "border border-walnut-600 bg-walnut-850 text-sand-300 hover:border-walnut-500 hover:text-cream-50",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[13px]",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-[15px]",
};

/** Class names for a button or a link that looks like one. */
export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = ""): string {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}
