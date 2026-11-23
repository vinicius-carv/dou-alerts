import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

export default async function setup() {
  const pool = new pg.Pool({ connectionString: "postgres://dou:dou@localhost:5433/dou_alerts" });
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
}
