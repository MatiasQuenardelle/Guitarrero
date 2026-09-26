import { authEnabled, getAuth } from "@/lib/auth/server";
import { isOwnerEmail } from "@/lib/auth/owner";

const off = () => Response.json({ error: "auth disabled" }, { status: 404 });

const handlers = authEnabled ? getAuth().handler() : { GET: off, POST: off };

export const { GET } = handlers;

/** The app is private, so email sign-up is only open to the owner's address. */
export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  if (new URL(request.url).pathname.endsWith("/sign-up/email")) {
    const { email } = (await request.clone().json().catch(() => ({}))) as { email?: string };
    if (!isOwnerEmail(email)) {
      return Response.json({ message: "Esta app es privada." }, { status: 403 });
    }
  }
  return handlers.POST(request, context);
}
