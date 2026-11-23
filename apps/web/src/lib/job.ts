import { and, asc, eq, isNull, lt, notExists, sql } from "drizzle-orm";
import type { DouAct } from "@dou-alerts/core";
import { buildDigest } from "@dou-alerts/core";
import { db } from "@/db";
import { act, alert, match, phraseCheck, pushToken, user } from "@/db/schema";
import type { sendEmail } from "./mailer";
import type { sendPush } from "./push";

export type DailyDeps = {
  search: (phrase: string) => Promise<DouAct[]>;
  sendEmail: typeof sendEmail;
  sendPush: typeof sendPush;
  now: () => number;
  budgetMs?: number;
};

const RETENTION_MS = 90 * 24 * 3600 * 1000;
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function runDaily(deps: DailyDeps) {
  const start = deps.now();
  const out = { phrases: 0, acts: 0, matches: 0, emails: 0, pushes: 0, errors: [] as string[] };

  // One entry per key, searched with the earliest alert's display phrase; never-checked first, then oldest check.
  const rows = await db
    .select({ key: alert.key, phrase: alert.phrase, checkedAt: phraseCheck.checkedAt })
    .from(alert)
    .leftJoin(phraseCheck, eq(phraseCheck.key, alert.key))
    .orderBy(asc(alert.createdAt));
  const byKey = new Map<string, { phrase: string; checkedAt: Date | null }>();
  for (const r of rows) if (!byKey.has(r.key)) byKey.set(r.key, r);
  const queue = [...byKey].sort(([, a], [, b]) => (a.checkedAt?.getTime() ?? -Infinity) - (b.checkedAt?.getTime() ?? -Infinity));

  for (const [key, { phrase }] of queue) {
    if (deps.now() - start > (deps.budgetMs ?? 240_000)) break;
    try {
      const found = await deps.search(phrase);
      out.phrases++;
      out.acts += found.length;
      if (found.length) {
        await db.insert(act).values(found).onConflictDoNothing();
        const alerts = await db.select({ id: alert.id }).from(alert).where(eq(alert.key, key));
        const values = alerts.flatMap((a) => found.map((f) => ({ alertId: a.id, actSlug: f.slug })));
        const ins = await db.insert(match).values(values).onConflictDoNothing().returning({ a: match.alertId });
        out.matches += ins.length;
      }
      const checkedAt = new Date(deps.now());
      await db.insert(phraseCheck).values({ key, checkedAt }).onConflictDoUpdate({ target: phraseCheck.key, set: { checkedAt } });
    } catch (e) {
      out.errors.push(`${phrase}: ${msg(e)}`);
    }
  }

  const pending = await db
    .select({ userId: user.id, email: user.email, alertId: alert.id, phrase: alert.phrase, act })
    .from(match)
    .innerJoin(alert, eq(alert.id, match.alertId))
    .innerJoin(user, eq(user.id, alert.userId))
    .innerJoin(act, eq(act.slug, match.actSlug))
    .where(isNull(match.notifiedAt));
  const byUser = Map.groupBy(pending, (r) => r.userId);
  for (const [userId, items] of byUser) {
    const digest = buildDigest(items.map((i) => ({ phrase: i.phrase, act: i.act })));
    try {
      await deps.sendEmail({ to: items[0]!.email, subject: digest.subject, html: digest.html, text: digest.text });
    } catch (e) {
      out.errors.push(`email ${items[0]!.email}: ${msg(e)}`);
      continue;
    }
    out.emails++;
    const now = new Date(deps.now());
    for (const i of items)
      await db.update(match).set({ notifiedAt: now }).where(and(eq(match.alertId, i.alertId), eq(match.actSlug, i.act.slug)));
    try {
      const tokens = (await db.select({ t: pushToken.token }).from(pushToken).where(eq(pushToken.userId, userId))).map((r) => r.t);
      if (tokens.length) {
        await deps.sendPush(tokens, digest.pushBody);
        out.pushes++;
      }
    } catch (e) {
      out.errors.push(`push ${userId}: ${msg(e)}`);
    }
  }

  // Retention: old matches, then acts nothing references.
  await db.delete(match).where(lt(match.createdAt, new Date(deps.now() - RETENTION_MS)));
  await db.delete(act).where(notExists(db.select({ x: sql`1` }).from(match).where(eq(match.actSlug, act.slug))));
  return out;
}
