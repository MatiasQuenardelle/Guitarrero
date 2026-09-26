import Link from "next/link";
import { Suspense } from "react";
import ScoreMock from "@/components/landing/ScoreMock";
import LanguageSwitch from "@/components/ui/LanguageSwitch";
import { Rosette, Wordmark } from "@/components/ui/Logo";
import { getDictionary } from "@/i18n/server";
import { authEnabled } from "@/lib/auth/server";
import AuthForm from "./AuthForm";

/** Sign-in and sign-up: the form on one side, a walnut stand with a score on the other. */
export default async function AuthLayout({ mode }: { mode: "signin" | "signup" }) {
  const { t } = await getDictionary();

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <main className="wood-quiet flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Guitarrero">
            <Wordmark />
          </Link>
          <LanguageSwitch />
        </div>
        <div className="flex flex-1 items-center justify-center py-12">
          <Suspense>
            <AuthForm mode={mode} enabled={authEnabled} />
          </Suspense>
        </div>
      </main>

      <aside className="wood relative hidden items-center justify-center overflow-hidden border-l border-brass-400/15 p-12 lg:flex">
        <div className="relative w-full max-w-lg">
          <div className="paper -rotate-[1.5deg] rounded-2xl p-2 shadow-[0_50px_90px_-40px_rgba(0,0,0,0.95)]">
            <ScoreMock className="block h-auto w-full" />
          </div>
          <div className="mt-12 flex items-start gap-4">
            <Rosette className="h-10 w-10 shrink-0" />
            <p className="font-display text-2xl italic leading-snug text-cream-100">
              {t.auth.aside}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
