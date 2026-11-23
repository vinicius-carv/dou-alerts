import { withUser } from "@/lib/api";
import { listMatches } from "@/lib/repo";

export const GET = (req: Request) => withUser(req, async (id) => Response.json({ matches: await listMatches(id) }));
