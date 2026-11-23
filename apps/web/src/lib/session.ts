import { auth } from "./auth";

export async function requireUser(req: Request): Promise<{ id: string; email: string } | null> {
  const session = await auth.api.getSession({ headers: req.headers });
  return session ? { id: session.user.id, email: session.user.email } : null;
}
