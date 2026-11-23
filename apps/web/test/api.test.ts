import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { act, alert, match, pushToken, user } from "@/db/schema";
import { createUser, resetDb } from "./db";

vi.mock("@/lib/session", () => ({ requireUser: vi.fn() }));
import { requireUser } from "@/lib/session";
import { GET as listAlerts, POST as postAlert } from "@/app/api/alerts/route";
import { DELETE as delAlert } from "@/app/api/alerts/[id]/route";
import { GET as getMatches } from "@/app/api/matches/route";
import { POST as postToken } from "@/app/api/push-token/route";
import { DELETE as delAccount } from "@/app/api/account/route";

const login = (u: { id: string } | null) =>
  vi.mocked(requireUser).mockResolvedValue(u ? { id: u.id, email: "x@example.com" } : null);
const json = (url: string, body: unknown, method = "POST") =>
  new Request(`http://t${url}`, { method, body: JSON.stringify(body), headers: { "content-type": "application/json" } });
const post = (phrase: string) => postAlert(json("/api/alerts", { phrase }));
const count = async () => (await db.select().from(alert)).length;
const del = (id: string) =>
  delAlert(new Request("http://t/x", { method: "DELETE" }), { params: Promise.resolve({ id }) });

beforeEach(resetDb);

describe("alerts", () => {
  it("rejects a phrase with a quote", async () => {
    login(await createUser("a@example.com"));
    const res = await post('a "b" c');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Não use aspas." });
    expect(await count()).toBe(0);
  });

  it("rejects a 2-char phrase", async () => {
    login(await createUser("a@example.com"));
    const res = await post("ab");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Use entre 3 e 100 caracteres." });
    expect(await count()).toBe(0);
  });

  it("rejects the 11th alert and keeps the count at 10", async () => {
    login(await createUser("a@example.com"));
    for (let i = 0; i < 10; i++) expect((await post(`frase ${i}`)).status).toBe(201);
    const res = await post("frase 11");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Limite de 10 alertas." });
    expect(await count()).toBe(10);
  });

  it("rejects a case-insensitive duplicate", async () => {
    login(await createUser("a@example.com"));
    await post("Licitação");
    const res = await post("LICITAÇÃO");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Alerta já existe." });
    expect(await count()).toBe(1);
  });

  it("creates and lists newest first", async () => {
    login(await createUser("a@example.com"));
    const res = await post("  primeira ");
    expect(res.status).toBe(201);
    expect((await res.json()).alert).toMatchObject({ phrase: "primeira" });
    await post("segunda");
    const { alerts } = await (await listAlerts(new Request("http://t/api/alerts"))).json();
    expect(alerts.map((a: { phrase: string }) => a.phrase)).toEqual(["segunda", "primeira"]);
    expect(Object.keys(alerts[0]).sort()).toEqual(["createdAt", "id", "phrase"]);
  });

  it("returns 401 without a session on every endpoint", async () => {
    login(null);
    const rs = await Promise.all([
      listAlerts(new Request("http://t/api/alerts")),
      post("abc"),
      del(crypto.randomUUID()),
      getMatches(new Request("http://t/api/matches")),
      postToken(json("/api/push-token", { token: "ExponentPushToken[a]" })),
      delAccount(new Request("http://t/api/account", { method: "DELETE" })),
    ]);
    for (const r of rs) {
      expect(r.status).toBe(401);
      expect(await r.json()).toEqual({ error: "Não autenticado." });
    }
  });

  it("deletes own alert (204)", async () => {
    login(await createUser("a@example.com"));
    const { alert: a } = await (await post("abc")).json();
    expect((await del(a.id)).status).toBe(204);
    expect(await count()).toBe(0);
  });

  it("404s when deleting another user's alert, which survives", async () => {
    const owner = await createUser("o@example.com");
    const [a] = await db.insert(alert).values({ userId: owner.id, phrase: "abc", key: "abc" }).returning();
    login(await createUser("b@example.com"));
    expect((await del(a!.id)).status).toBe(404);
    expect(await count()).toBe(1);
  });

  it("404s on a non-uuid id", async () => {
    login(await createUser("a@example.com"));
    expect((await del("nope")).status).toBe(404);
  });
});

describe("matches", () => {
  it("returns only the user's matches, newest first, in DouAct shape", async () => {
    const u = await createUser("a@example.com");
    const other = await createUser("b@example.com");
    const [a1] = await db.insert(alert).values({ userId: u.id, phrase: "um", key: "um" }).returning();
    const [a2] = await db.insert(alert).values({ userId: u.id, phrase: "dois", key: "dois" }).returning();
    const [a3] = await db.insert(alert).values({ userId: other.id, phrase: "tres", key: "tres" }).returning();
    await db.insert(act).values(
      ["s1", "s2"].map((slug) => ({ slug, title: `t-${slug}`, organ: "Org", section: "do1", pubDate: "2026-01-01", excerpt: "e", url: `u-${slug}` })),
    );
    await db.insert(match).values([
      { alertId: a1!.id, actSlug: "s1", createdAt: new Date("2026-01-01") },
      { alertId: a2!.id, actSlug: "s2", createdAt: new Date("2026-01-02") },
      { alertId: a3!.id, actSlug: "s1" },
    ]);
    login(u);
    const { matches } = await (await getMatches(new Request("http://t/api/matches"))).json();
    expect(matches.map((m: { phrase: string }) => m.phrase)).toEqual(["dois", "um"]);
    expect(matches[0].act).toEqual({ slug: "s2", title: "t-s2", organ: "Org", section: "do1", pubDate: "2026-01-01", excerpt: "e", url: "u-s2" });
    expect(matches[0].createdAt).toBeTruthy();
  });
});

describe("push token", () => {
  it("rejects malformed tokens", async () => {
    login(await createUser("a@example.com"));
    expect((await postToken(json("/api/push-token", { token: "abc" }))).status).toBe(400);
    expect((await postToken(json("/api/push-token", {}))).status).toBe(400);
  });

  it("stores a token and reassigns it to the new user", async () => {
    const a = await createUser("a@example.com");
    const b = await createUser("b@example.com");
    const token = "ExponentPushToken[abc]";
    login(a);
    expect((await postToken(json("/api/push-token", { token }))).status).toBe(204);
    login(b);
    expect((await postToken(json("/api/push-token", { token }))).status).toBe(204);
    const rows = await db.select().from(pushToken);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.userId).toBe(b.id);
  });
});

describe("account", () => {
  it("deletes the user and cascades", async () => {
    const u = await createUser("a@example.com");
    login(u);
    await post("abc");
    expect((await delAccount(new Request("http://t/api/account", { method: "DELETE" }))).status).toBe(204);
    expect(await db.select().from(user).where(eq(user.id, u.id))).toHaveLength(0);
    expect(await count()).toBe(0);
  });
});
