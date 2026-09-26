import { createNeonAuth } from "@neondatabase/auth/next/server";

/**
 * Neon Auth (managed Better Auth). Without its env vars — a fresh clone, a preview without
 * secrets — sign-in is simply off and the app stays open, so it can still be worked on.
 */
export const authEnabled = Boolean(
  process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET,
);

type NeonAuth = ReturnType<typeof createNeonAuth>;

let instance: NeonAuth | null = null;

export function getAuth(): NeonAuth {
  if (!authEnabled) throw new Error("Neon Auth is not configured (NEON_AUTH_BASE_URL)");
  instance ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET!, sameSite: "lax" },
  });
  return instance;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

/** The signed-in user, or null (always null while auth is off). */
export async function currentUser(): Promise<SessionUser | null> {
  if (!authEnabled) return null;
  const { data } = await getAuth().getSession();
  return data?.user ?? null;
}
