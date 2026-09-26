import { notFound } from "next/navigation";

/**
 * The studio — reading tabs out of YouTube videos, editing scores, publishing — is a local
 * tool for whoever curates the library. It works on the dev server, or anywhere with
 * GUITARRERO_ADMIN=1, and doesn't exist for anyone else.
 */
export const isAdmin =
  process.env.NODE_ENV !== "production" || process.env.GUITARRERO_ADMIN === "1";

/** For studio pages: 404 unless admin. */
export function requireAdmin(): void {
  if (!isAdmin) notFound();
}

/** For studio API routes: a 404 response unless admin, else null. */
export function adminOnly(): Response | null {
  return isAdmin ? null : Response.json({ error: "not found" }, { status: 404 });
}
