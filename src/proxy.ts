import { NextResponse, type NextRequest } from "next/server";
import { authEnabled, getAuth } from "@/lib/auth/server";

const session = authEnabled ? getAuth().middleware({ loginUrl: "/login" }) : null;

/**
 * The app is private: Neon's middleware refreshes sessions, finishes the Google sign-in
 * exchange and sends signed-out visitors to /login. Pages then check it's the owner.
 */
export default async function proxy(request: NextRequest) {
  return session ? session(request) : NextResponse.next();
}

export const config = {
  matcher: ["/library/:path*", "/piece/:path*", "/reader/:path*", "/studio/:path*"],
};
