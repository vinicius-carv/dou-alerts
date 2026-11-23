import { withUser } from "@/lib/api";
import { addAlert, listAlerts } from "@/lib/repo";

export const GET = (req: Request) => withUser(req, async (id) => Response.json({ alerts: await listAlerts(id) }));

export const POST = (req: Request) =>
  withUser(req, async (id) => {
    const body = await req.json().catch(() => null);
    const r = await addAlert(id, typeof body?.phrase === "string" ? body.phrase : "");
    return r.ok ? Response.json({ alert: r.alert }, { status: 201 }) : Response.json({ error: r.error }, { status: 400 });
  });
