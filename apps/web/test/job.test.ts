import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { act, alert, match, phraseCheck, pushToken } from "@/db/schema";
import { runDaily, type DailyDeps } from "@/lib/job";
import { GET } from "@/app/api/cron/daily/route";
import { createUser, resetDb } from "./db";

const mkAct = (slug: string) => ({
  slug, title: `T ${slug}`, organ: "Org", section: "do3", pubDate: "01/01/2026", excerpt: "ex", url: `https://x/${slug}`,
});
const addAlert = async (userId: string, phrase: string, createdAt = new Date()) => {
  const [a] = await db.insert(alert).values({ userId, phrase, key: phrase.toLowerCase(), createdAt }).returning();
  return a!;
};
const deps = (over: Partial<DailyDeps> = {}): DailyDeps & { search: ReturnType<typeof vi.fn> } => ({
  search: vi.fn(async () => [mkAct("a1")]),
  sendEmail: vi.fn(async () => {}),
  sendPush: vi.fn(async () => {}),
  now: () => Date.now(),
  ...over,
}) as never;

beforeEach(resetDb);

describe("runDaily", () => {
  it("searches a shared phrase once, emails each user once, then nothing on rerun", async () => {
    const [u1, u2] = [await createUser("a@x.com"), await createUser("b@x.com")];
    await addAlert(u1.id, "Banco do Brasil");
    await addAlert(u2.id, "banco do brasil");
    await db.insert(pushToken).values({ token: "ExponentPushToken[abc]", userId: u1.id });
    const d = deps();
    const r = await runDaily(d);
    expect(d.search).toHaveBeenCalledTimes(1);
    expect(d.search).toHaveBeenCalledWith("Banco do Brasil");
    expect(d.sendEmail).toHaveBeenCalledTimes(2);
    expect(d.sendPush).toHaveBeenCalledTimes(1);
    expect(d.sendPush).toHaveBeenCalledWith(["ExponentPushToken[abc]"], expect.any(String));
    expect(r).toMatchObject({ phrases: 1, matches: 2, emails: 2, pushes: 1, errors: [] });
    expect((await db.select().from(match)).every((m) => m.notifiedAt)).toBe(true);
    const d2 = deps();
    expect((await runDaily(d2)).emails).toBe(0);
    expect(d2.sendEmail).not.toHaveBeenCalled();
  });

  it("stores B's matches when search for A throws", async () => {
    const u = await createUser("a@x.com");
    await addAlert(u.id, "AAA");
    await addAlert(u.id, "BBB");
    const r = await runDaily(deps({ search: vi.fn(async (p: string) => { if (p === "AAA") throw new Error("boom"); return [mkAct("b1")]; }) }));
    expect(r.errors).toEqual(["AAA: boom"]);
    expect((await db.select().from(match)).map((m) => m.actSlug)).toEqual(["b1"]);
  });

  it("keeps matches unnotified when the email fails, and retries next run", async () => {
    const [x, y] = [await createUser("x@x.com"), await createUser("y@x.com")];
    await addAlert(x.id, "Foo");
    await addAlert(y.id, "Foo");
    const failX = vi.fn(async (m: { to: string }) => { if (m.to === "x@x.com") throw new Error("smtp"); });
    const r = await runDaily(deps({ sendEmail: failX as never }));
    expect(r.emails).toBe(1);
    expect(r.errors[0]).toContain("x@x.com");
    const rows = await db.select({ n: match.notifiedAt, u: alert.userId }).from(match).innerJoin(alert, eq(alert.id, match.alertId));
    expect(rows.find((m) => m.u === x.id)!.n).toBeNull();
    expect(rows.find((m) => m.u === y.id)!.n).not.toBeNull();
    const d = deps();
    await runDaily(d);
    expect(d.sendEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(d.sendEmail).mock.calls[0]![0].to).toBe("x@x.com");
  });

  it("sends one email listing both phrases for the same act", async () => {
    const u = await createUser("a@x.com");
    await addAlert(u.id, "Foo");
    await addAlert(u.id, "Bar");
    const d = deps();
    await runDaily(d);
    expect(d.sendEmail).toHaveBeenCalledTimes(1);
    const m = vi.mocked(d.sendEmail).mock.calls[0]![0];
    expect(m.text).toContain("== Foo ==");
    expect(m.text).toContain("== Bar ==");
  });

  it("stops after the budget and searches the skipped phrase first next run", async () => {
    const u = await createUser("a@x.com");
    await addAlert(u.id, "AAA", new Date(Date.now() - 2000));
    await addAlert(u.id, "BBB", new Date(Date.now() - 1000));
    let t = Date.now();
    const d = deps({ now: () => t, budgetMs: 1000, search: vi.fn(async () => { t += 5000; return []; }) });
    await runDaily(d);
    expect(d.search).toHaveBeenCalledTimes(1);
    expect(d.search).toHaveBeenCalledWith("AAA");
    const d2 = deps({ search: vi.fn(async () => []) });
    await runDaily(d2);
    expect(vi.mocked(d2.search).mock.calls[0]![0]).toBe("BBB");
  });

  it("deletes matches older than 90 days and their orphan acts", async () => {
    const u = await createUser("a@x.com");
    const a = await addAlert(u.id, "Foo");
    await db.insert(act).values([mkAct("old"), mkAct("keep")]);
    await db.insert(match).values([
      { alertId: a.id, actSlug: "old", createdAt: new Date(Date.now() - 91 * 86400_000), notifiedAt: new Date() },
      { alertId: a.id, actSlug: "keep", notifiedAt: new Date() },
    ]);
    await runDaily(deps({ search: vi.fn(async () => []) }));
    expect((await db.select().from(match)).map((m) => m.actSlug)).toEqual(["keep"]);
    expect((await db.select().from(act)).map((x) => x.slug)).toEqual(["keep"]);
    expect(await db.select().from(phraseCheck)).toHaveLength(1);
  });
});

describe("GET /api/cron/daily", () => {
  it("returns 401 without a valid bearer, even when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect((await GET(new Request("http://t/api/cron/daily"))).status).toBe(401);
    expect((await GET(new Request("http://t/", { headers: { authorization: "Bearer nope" } }))).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(new Request("http://t/", { headers: { authorization: "Bearer undefined" } }))).status).toBe(401);
    vi.unstubAllEnvs();
  });
});
