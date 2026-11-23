import { sql } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";

export async function resetDb(): Promise<void> {
  await db.execute(
    sql`TRUNCATE "user", "session", "account", "verification", "alert", "act", "match", "phrase_check", "push_token" CASCADE`,
  );
}

export async function createUser(email: string): Promise<{ id: string }> {
  const id = crypto.randomUUID();
  await db.insert(user).values({ id, name: email, email });
  return { id };
}
