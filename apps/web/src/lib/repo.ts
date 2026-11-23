import { desc, eq, and, sql } from "drizzle-orm";
import { normalizePhrase, type DouAct } from "@dou-alerts/core";
import { db } from "@/db";
import { act, alert, match, pushToken, user } from "@/db/schema";

export const MAX_ALERTS = 10;

const PG_UNIQUE_VIOLATION = "23505";
const isUniqueViolation = (e: unknown) =>
  [e, (e as { cause?: unknown })?.cause].some((x) => (x as { code?: string } | undefined)?.code === PG_UNIQUE_VIOLATION);

export async function listAlerts(userId: string) {
  return db
    .select({ id: alert.id, phrase: alert.phrase, createdAt: alert.createdAt })
    .from(alert)
    .where(eq(alert.userId, userId))
    .orderBy(desc(alert.createdAt));
}

export type AddAlertResult =
  | { ok: true; alert: { id: string; phrase: string; createdAt: Date } }
  | { ok: false; error: string };

export async function addAlert(userId: string, input: string): Promise<AddAlertResult> {
  const n = normalizePhrase(input);
  if (!n.ok) return n;
  try {
    return await db.transaction(async (tx) => {
      // Serialise per user so concurrent POSTs cannot exceed the cap.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userId}))`);
      const [{ n: total }] = await tx.select({ n: sql<number>`count(*)::int` }).from(alert).where(eq(alert.userId, userId));
      if (total! >= MAX_ALERTS) return { ok: false as const, error: "Limite de 10 alertas." };
      const [row] = await tx
        .insert(alert)
        .values({ userId, phrase: n.phrase, key: n.key })
        .returning({ id: alert.id, phrase: alert.phrase, createdAt: alert.createdAt });
      return { ok: true as const, alert: row! };
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "Alerta já existe." };
    throw e;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns false when the alert does not exist or is not the user's. */
export async function deleteAlert(userId: string, id: string): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const rows = await db.delete(alert).where(and(eq(alert.id, id), eq(alert.userId, userId))).returning({ id: alert.id });
  return rows.length > 0;
}

export async function listMatches(userId: string): Promise<{ phrase: string; act: DouAct; createdAt: Date }[]> {
  const rows = await db
    .select({ phrase: alert.phrase, createdAt: match.createdAt, a: act })
    .from(match)
    .innerJoin(alert, eq(match.alertId, alert.id))
    .innerJoin(act, eq(match.actSlug, act.slug))
    .where(eq(alert.userId, userId))
    .orderBy(desc(match.createdAt))
    .limit(100);
  return rows.map(({ phrase, createdAt, a }) => ({
    phrase,
    createdAt,
    act: { slug: a.slug, title: a.title, organ: a.organ, section: a.section, pubDate: a.pubDate, excerpt: a.excerpt, url: a.url } as DouAct,
  }));
}

export async function savePushToken(userId: string, token: string): Promise<void> {
  await db.insert(pushToken).values({ token, userId }).onConflictDoUpdate({ target: pushToken.token, set: { userId } });
}

export async function deleteUser(userId: string): Promise<void> {
  await db.delete(user).where(eq(user.id, userId));
}
