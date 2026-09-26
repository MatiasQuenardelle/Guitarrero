import type { Metadata } from "next";
import ReaderApp from "@/components/reader/ReaderApp";

export const metadata: Metadata = { title: "Lector de tabs" };

export default function ReaderPage() {
  return <ReaderApp />;
}
