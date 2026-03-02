"use client";

interface TabLineProps {
  content: string;
}

export default function TabLine({ content }: TabLineProps) {
  return (
    <pre
      className="font-mono text-zinc-500 leading-tight whitespace-pre"
      style={{ fontSize: "var(--tab-font-size, 14px)" }}
    >
      {content}
    </pre>
  );
}
