"use client";

import { useState } from "react";
import { Section } from "@/lib/types";
import SectionCard from "./SectionCard";

interface SectionGridProps {
  sections: Section[];
  fontSize?: number;
  transposeAmount?: number;
  onSplitSection?: (sectionIndex: number, lineIndex: number) => void;
}

export default function SectionGrid({
  sections,
  fontSize = 14,
  transposeAmount = 0,
  onSplitSection,
}: SectionGridProps) {
  const [sectionOrder, setSectionOrder] = useState<number[]>(() => sections.map((_, i) => i));
  const [orderedFor, setOrderedFor] = useState(sections);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // A split changes the sections: start again from their natural order.
  if (orderedFor !== sections) {
    setOrderedFor(sections);
    setSectionOrder(sections.map((_, i) => i));
  }

  const handleDragStart = (orderIdx: number) => (e: React.DragEvent) => {
    setDraggedIndex(orderIdx);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (orderIdx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(orderIdx);
  };

  const handleDrop = (orderIdx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === orderIdx) return;

    const newOrder = [...sectionOrder];
    const [moved] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(orderIdx, 0, moved);
    setSectionOrder(newOrder);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  if (sectionOrder.length === 0) return null;

  return (
    <div
      className="flex flex-wrap gap-4 items-start"
      style={{ "--tab-font-size": `${fontSize}px` } as React.CSSProperties}
    >
      {sectionOrder.map((sectionIdx, orderIdx) => (
        <SectionCard
          key={sectionIdx}
          section={sections[sectionIdx]}
          transposeAmount={transposeAmount}
          draggable
          onDragStart={handleDragStart(orderIdx)}
          onDragOver={handleDragOver(orderIdx)}
          onDrop={handleDrop(orderIdx)}
          onDragEnd={handleDragEnd}
          isDragging={draggedIndex === orderIdx}
          isDragOver={dragOverIndex === orderIdx}
          onSplit={onSplitSection ? (lineIndex) => onSplitSection(sectionIdx, lineIndex) : undefined}
        />
      ))}
    </div>
  );
}
