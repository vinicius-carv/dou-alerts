import { withUser } from "@/lib/api";
import { savePushToken } from "@/lib/repo";

export const POST = (req: Request) =>
  withUser(req, async (id) => {
    const body = await req.json().catch(() => null);
    const token = body?.token;
    if (typeof token !== "string" || !/^ExponentPushToken\[.+\]$/.test(token))
      return Response.json({ error: "Token inválido." }, { status: 400 });
    await savePushToken(id, token);
    return new Response(null, { status: 204 });
  });
