"use client";

interface LyricLineProps {
  content: string;
}

export default function LyricLine({ content }: LyricLineProps) {
  return (
    <pre
      className="font-mono text-zinc-200 leading-tight whitespace-pre"
      style={{ fontSize: "var(--tab-font-size, 14px)" }}
    >
      {content}
    </pre>
  );
}
