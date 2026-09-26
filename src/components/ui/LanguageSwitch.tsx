"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { LOCALES } from "@/i18n/dictionaries";

export default function LanguageSwitch({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <div
      role="group"
      aria-label={t.nav.language}
      className={`inline-flex rounded-full border border-walnut-600 bg-walnut-900/70 p-0.5 text-[11px] font-semibold tracking-[0.14em] ${className}`}
    >
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => code !== locale && setLocale(code)}
          aria-pressed={code === locale}
          className={`h-7 min-w-9 rounded-full px-2 uppercase transition-colors ${
            code === locale ? "bg-brass-400/90 text-walnut-950" : "text-sand-400 hover:text-cream-50"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
