"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { authClient } from "@/lib/auth/client";

type Mode = "signin" | "signup";

/** Only same-site paths, so a crafted ?next= can't bounce people elsewhere. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/library";
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

const inputClass =
  "h-12 w-full rounded-xl border border-walnut-600 bg-walnut-950/70 px-4 text-[15px] text-cream-50 placeholder:text-sand-600 outline-none transition-colors focus:border-brass-400/70 focus:bg-walnut-950";

export default function AuthForm({ mode, enabled }: { mode: Mode; enabled: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [pending, setPending] = useState<"form" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === "signup";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();

    setPending("form");
    setError(null);
    try {
      const { error: failure } = isSignUp
        ? await authClient.signUp.email({ email, password, name: name || email.split("@")[0] })
        : await authClient.signIn.email({ email, password });
      if (failure) {
        setError(failure.message || t.auth.genericError);
        setPending(null);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError(t.auth.genericError);
      setPending(null);
    }
  }

  async function google() {
    setPending("google");
    setError(null);
    try {
      const { error: failure } = await authClient.signIn.social({
        provider: "google",
        callbackURL: next,
      });
      if (failure) {
        setError(failure.message || t.auth.genericError);
        setPending(null);
      }
    } catch {
      setError(t.auth.genericError);
      setPending(null);
    }
  }

  const otherHref = `${isSignUp ? "/login" : "/signup"}${next !== "/library" ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <div className="w-full max-w-[400px]">
      <h1 className="font-display text-[2.6rem] font-medium leading-tight text-cream-50">
        {isSignUp ? t.auth.signUpTitle : t.auth.signInTitle}
      </h1>
      <p className="mt-2 text-[15px] text-sand-300">{isSignUp ? t.auth.signUpLead : t.auth.signInLead}</p>

      {!enabled ? (
        <p className="mt-8 rounded-xl border border-brass-400/25 bg-brass-400/10 px-4 py-3 text-sm text-brass-200">
          {t.auth.disabled}
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={google}
            disabled={pending !== null}
            className={buttonClass("secondary", "lg", "mt-8 w-full")}
          >
            <GoogleMark />
            {t.auth.google}
          </button>

          <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-sand-500">
            <span className="h-px flex-1 bg-walnut-600" />
            {t.auth.or}
            <span className="h-px flex-1 bg-walnut-600" />
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4">
            {isSignUp && (
              <label className="flex flex-col gap-1.5 text-sm text-sand-300">
                {t.auth.name}
                <input name="name" autoComplete="name" className={inputClass} />
              </label>
            )}
            <label className="flex flex-col gap-1.5 text-sm text-sand-300">
              {t.auth.email}
              <input name="email" type="email" required autoComplete="email" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-sand-300">
              {t.auth.password}
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                className={inputClass}
              />
              {isSignUp && <span className="text-xs text-sand-500">{t.auth.passwordHint}</span>}
            </label>

            {error && (
              <p role="alert" className="rounded-xl border border-rosewood-500/50 bg-rosewood-900/50 px-4 py-2.5 text-sm text-rosewood-400">
                {error}
              </p>
            )}

            <button type="submit" disabled={pending !== null} className={buttonClass("primary", "lg", "mt-2 w-full")}>
              {pending === "form" ? "…" : isSignUp ? t.auth.submitSignUp : t.auth.submitSignIn}
            </button>
          </form>
        </>
      )}

      <p className="mt-8 text-center text-sm text-sand-400">
        {isSignUp ? t.auth.haveAccount : t.auth.noAccount}{" "}
        <Link href={otherHref} className="font-medium text-brass-300 underline-offset-4 hover:underline">
          {isSignUp ? t.nav.signIn : t.nav.signUp}
        </Link>
      </p>
    </div>
  );
}
