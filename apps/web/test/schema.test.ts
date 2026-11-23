import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { act, alert, match, pushToken, user } from "@/db/schema";
import { createUser, resetDb } from "./db";

beforeEach(resetDb);

describe("schema", () => {
  it("rejects a duplicate (userId, key) alert", async () => {
    const u = await createUser("a@example.com");
    await db.insert(alert).values({ userId: u.id, phrase: "Licitação", key: "licitacao" });
    await expect(
      db.insert(alert).values({ userId: u.id, phrase: "LICITAÇÃO", key: "licitacao" }),
    ).rejects.toThrow();
  });

  it("cascades user deletion to alerts, matches and push tokens", async () => {
    const u = await createUser("b@example.com");
    const [a] = await db.insert(alert).values({ userId: u.id, phrase: "x", key: "x" }).returning();
    await db.insert(act).values({ slug: "s1", title: "t", section: "do1", pubDate: "2026-01-01", excerpt: "e", url: "u" });
    await db.insert(match).values({ alertId: a!.id, actSlug: "s1" });
    await db.insert(pushToken).values({ token: "tok", userId: u.id });

    await db.delete(user).where(eq(user.id, u.id));

    expect(await db.select().from(alert)).toHaveLength(0);
    expect(await db.select().from(match)).toHaveLength(0);
    expect(await db.select().from(pushToken)).toHaveLength(0);
    expect(await db.select().from(act)).toHaveLength(1); // acts are shared, kept
  });
});
