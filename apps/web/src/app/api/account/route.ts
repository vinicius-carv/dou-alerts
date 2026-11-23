import { withUser } from "@/lib/api";
import { deleteUser } from "@/lib/repo";

export const DELETE = (req: Request) =>
  withUser(req, async (id) => {
    await deleteUser(id);
    return new Response(null, { status: 204 });
  });
