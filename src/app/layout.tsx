import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { I18nProvider } from "@/i18n/I18nProvider";
import { getLocale } from "@/i18n/server";
import "./globals.css";

// Self-hosted (latin, variable): next/font/google breaks the Vercel build when Google hands
// its servers /l/font?kit=… URLs, which Turbopack can't resolve.
const inter = localFont({
  variable: "--font-inter",
  src: "./fonts/inter.woff2",
  weight: "100 900",
});

const cormorant = localFont({
  variable: "--font-cormorant",
  src: [
    { path: "./fonts/cormorant-garamond.woff2", weight: "300 700", style: "normal" },
    { path: "./fonts/cormorant-garamond-italic.woff2", weight: "300 700", style: "italic" },
  ],
});

const jetbrains = localFont({
  variable: "--font-jetbrains",
  src: "./fonts/jetbrains-mono.woff2",
  weight: "100 800",
});

export const metadata: Metadata = {
  title: {
    default: "Guitarrero — Estudio de guitarra clásica",
    template: "%s · Guitarrero",
  },
  description:
    "Repertorio de guitarra clásica en partitura y tablatura, con un reproductor para estudiar: tempo, loop de compases, metrónomo y pantalla completa.",
};

export const viewport: Viewport = {
  themeColor: "#110b08",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${inter.variable} ${cormorant.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh antialiased">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
