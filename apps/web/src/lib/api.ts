import { requireUser } from "./session";

export const unauthorized = () => Response.json({ error: "Não autenticado." }, { status: 401 });

/** Runs `fn` for the signed-in user, or answers 401. */
export async function withUser(req: Request, fn: (userId: string) => Promise<Response>): Promise<Response> {
  const u = await requireUser(req);
  return u ? fn(u.id) : unauthorized();
}
