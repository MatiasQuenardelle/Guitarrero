"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { LibraryIcon, LogoutIcon, ReaderIcon, StarIcon } from "@/components/ui/Icons";
import LanguageSwitch from "@/components/ui/LanguageSwitch";
import { Rosette, Wordmark } from "@/components/ui/Logo";
import { useI18n } from "@/i18n/I18nProvider";
import { authClient } from "@/lib/auth/client";
import type { SessionUser } from "@/lib/auth/server";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}

function initials(user: SessionUser): string {
  const source = user.name || user.email;
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function Avatar({ user, className = "h-9 w-9" }: { user: SessionUser; className?: string }) {
  return user.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.image} alt="" className={`${className} rounded-full object-cover ring-1 ring-brass-400/40`} />
  ) : (
    <span
      className={`${className} flex items-center justify-center rounded-full bg-walnut-700 font-display text-[15px] font-semibold text-brass-300 ring-1 ring-brass-400/40`}
    >
      {initials(user)}
    </span>
  );
}

function SideLink({ item, small = false }: { item: NavItem; small?: boolean }) {
  return (
    <Link
      href={item.href}
      className={`group relative flex items-center gap-3 rounded-xl px-3 font-medium transition-colors ${
        small ? "h-10 text-[13px]" : "h-11 text-[14px]"
      } ${
        item.active
          ? "bg-walnut-800 text-cream-50 ring-1 ring-inset ring-brass-400/20"
          : "text-sand-400 hover:bg-walnut-850 hover:text-cream-100"
      }`}
    >
      {item.active && <span className="absolute -left-4 top-2.5 h-6 w-[3px] rounded-r-full bg-brass-400" aria-hidden />}
      <span className={item.active ? "text-brass-300" : ""}>{item.icon}</span>
      {item.label}
    </Link>
  );
}

export default function AppShell({
  user,
  admin,
  accounts,
  children,
}: {
  user: SessionUser | null;
  admin: boolean;
  /** Sign-in is configured; without it the app runs with no account at all. */
  accounts: boolean;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const view = useSearchParams().get("view");
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const inLibrary = pathname === "/library";
  const items: NavItem[] = [
    {
      href: "/library",
      label: t.nav.library,
      icon: <LibraryIcon />,
      active: (inLibrary && view !== "favorites") || pathname.startsWith("/piece"),
    },
    {
      href: "/library?view=favorites",
      label: t.nav.favorites,
      icon: <StarIcon />,
      active: inLibrary && view === "favorites",
    },
    { href: "/reader", label: t.nav.reader, icon: <ReaderIcon />, active: pathname.startsWith("/reader") },
  ];

  // The player needs the whole phone screen; its page has its own way back.
  const onPiece = pathname.startsWith("/piece/");

  async function signOut() {
    await authClient.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="wood-quiet min-h-dvh lg:grid lg:grid-cols-[232px_1fr]">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-brass-400/10 bg-walnut-950/80 px-4 py-6 lg:flex">
        <Link href="/library" className="px-2" aria-label="Guitarrero">
          <Wordmark />
        </Link>

        <nav className="mt-10 flex flex-col gap-1">
          {items.slice(0, 2).map((item) => (
            <SideLink key={item.href} item={item} />
          ))}
        </nav>

        <div className="mt-8">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-sand-600">{t.nav.tools}</p>
          <div className="mt-2 flex flex-col gap-1">
            <SideLink item={items[2]} small />
            {admin && (
              <SideLink
                small
                item={{
                  href: "/studio",
                  label: `${t.nav.studio} · admin`,
                  icon: <Rosette className="h-5 w-5" />,
                  active: pathname.startsWith("/studio"),
                }}
              />
            )}
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-4">
          <LanguageSwitch className="self-start" />
          {!user && accounts && (
            <div className="flex flex-col gap-2">
              <Link href={`/signup?next=${encodeURIComponent(pathname)}`} className={buttonClass("primary", "sm")}>
                {t.nav.signUp}
              </Link>
              <Link href={`/login?next=${encodeURIComponent(pathname)}`} className={buttonClass("ghost", "sm")}>
                {t.nav.signIn}
              </Link>
            </div>
          )}
          {user && (
            <div className="flex items-center gap-3 rounded-2xl border border-brass-400/10 bg-walnut-900/80 p-2.5">
              <Avatar user={user} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-cream-100">{user.name || user.email}</p>
                <p className="truncate text-[11px] text-sand-500">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={signOut}
                title={t.nav.signOut}
                aria-label={t.nav.signOut}
                className="flex h-8 w-8 items-center justify-center rounded-full text-sand-400 hover:bg-walnut-700 hover:text-cream-50"
              >
                <LogoutIcon />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Top bar (phones and tablets) */}
      <header
        className={`sticky top-0 z-30 flex h-14 items-center justify-between border-b border-brass-400/10 bg-night/90 px-4 lg:hidden ${
          onPiece ? "hidden" : ""
        }`}
      >
        <Link href="/library" aria-label="Guitarrero">
          <Wordmark />
        </Link>
        <div className="relative flex items-center gap-2">
          <LanguageSwitch />
          {!user && accounts && (
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className={buttonClass("ghost", "sm", "border border-brass-400/40")}
            >
              {t.nav.signIn}
            </Link>
          )}
          {user && (
            <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={t.nav.account}>
              <Avatar user={user} className="h-8 w-8" />
            </button>
          )}
          {menuOpen && user && (
            <div className="panel absolute right-0 top-11 z-40 w-60 rounded-2xl p-3">
              <p className="truncate text-sm font-medium text-cream-100">{user.name || user.email}</p>
              <p className="truncate text-xs text-sand-500">{user.email}</p>
              {admin && (
                <Link
                  href="/studio"
                  className="mt-3 flex h-10 items-center gap-2 rounded-xl px-2 text-sm text-sand-300 hover:bg-walnut-700"
                >
                  <Rosette className="h-5 w-5" /> {t.nav.studio}
                </Link>
              )}
              <button
                type="button"
                onClick={signOut}
                className="mt-1 flex h-10 w-full items-center gap-2 rounded-xl px-2 text-sm text-sand-300 hover:bg-walnut-700"
              >
                <LogoutIcon /> {t.nav.signOut}
              </button>
            </div>
          )}
        </div>
      </header>

      <div className={`min-w-0 ${onPiece ? "" : "pb-24 lg:pb-0"}`}>{children}</div>

      {/* Tab bar (phones) */}
      {!onPiece && (
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-brass-400/15 bg-walnut-950 pb-[env(safe-area-inset-bottom)] lg:hidden">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                item.active ? "text-brass-300" : "text-sand-500"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
