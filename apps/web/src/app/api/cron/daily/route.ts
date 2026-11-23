import { searchPhrase } from "@dou-alerts/core";
import { runDaily } from "@/lib/job";
import { sendEmail } from "@/lib/mailer";
import { sendPush } from "@/lib/push";

export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return new Response("Unauthorized", { status: 401 });
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  const summary = await runDaily({
    search: (p) => searchPhrase(p, { fetch, sleep }),
    sendEmail,
    sendPush,
    now: Date.now,
  });
  return Response.json(summary);
}
