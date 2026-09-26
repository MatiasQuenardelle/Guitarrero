import Link from "next/link";
import { Wordmark } from "@/components/ui/Logo";
import LanguageSwitch from "@/components/ui/LanguageSwitch";
import { buttonClass } from "@/components/ui/button";
import type { Dictionary } from "@/i18n/dictionaries";

export default function SiteHeader({
  t,
  signedIn,
  admin,
}: {
  t: Dictionary;
  signedIn: boolean;
  admin: boolean;
}) {
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
      <Link href="/" aria-label="Guitarrero">
        <Wordmark />
      </Link>

      <nav className="hidden items-center gap-7 text-sm text-sand-300 md:flex">
        <a href="#repertorio" className="transition-colors hover:text-cream-50">
          {t.landing.repertoireTitle}
        </a>
        <a href="#funciones" className="transition-colors hover:text-cream-50">
          {t.nav.features}
        </a>
        <a href="#lector" className="transition-colors hover:text-cream-50">
          {t.nav.reader}
        </a>
        {admin && (
          <Link href="/studio" className="text-brass-400 transition-colors hover:text-brass-300">
            {t.nav.studio}
          </Link>
        )}
      </nav>

      <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden sm:block">
          <LanguageSwitch />
        </span>
        {!signedIn && (
          <Link href="/login" className={buttonClass("ghost", "sm", "max-sm:hidden")}>
            {t.nav.signIn}
          </Link>
        )}
        <Link href="/library" className={buttonClass("primary", "sm")}>
          {t.nav.openApp}
        </Link>
      </div>
    </header>
  );
}
