import { redirect } from "next/navigation";
import { authEnabled, currentUser, type SessionUser } from "./server";

/**
 * The app is private for now: only these accounts get in. Anyone else can still sign in with
 * Google (Neon Auth creates the account) but never sees past /login.
 */
export const OWNER_EMAILS = ["matiasquenardelle@gmail.com", "matias.europroyectos@gmail.com"];

export function isOwnerEmail(email: string | null | undefined): boolean {
  return OWNER_EMAILS.includes(email?.trim().toLowerCase() ?? "");
}

/** The owner when signed in as them, else null. With auth off (local, no env) it's open. */
export async function ownerUser(): Promise<SessionUser | null> {
  const user = await currentUser();
  return user && isOwnerEmail(user.email) ? user : null;
}

/** For private pages: back to /login unless the owner is signed in. */
export async function requireOwner(): Promise<SessionUser | null> {
  if (!authEnabled) return null;
  const user = await ownerUser();
  if (!user) redirect("/login");
  return user;
}
