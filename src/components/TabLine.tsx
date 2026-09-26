"use client";

interface TabLineProps {
  content: string;
}

export default function TabLine({ content }: TabLineProps) {
  return (
    <pre
      className="font-mono text-sand-400 leading-tight whitespace-pre"
      style={{ fontSize: "var(--tab-font-size, 14px)" }}
    >
      {content}
    </pre>
  );
}
