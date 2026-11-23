import { withUser } from "@/lib/api";
import { deleteAlert } from "@/lib/repo";

export const DELETE = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  withUser(req, async (userId) =>
    (await deleteAlert(userId, (await params).id))
      ? new Response(null, { status: 204 })
      : Response.json({ error: "Alerta não encontrado." }, { status: 404 }),
  );
