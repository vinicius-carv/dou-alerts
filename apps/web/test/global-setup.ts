import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const BASE = "postgres://dou:dou@localhost:5433";
export const TEST_DB = "dou_alerts_test";

export default async function setup() {
  // Tests truncate tables, so they get their own database next to the dev one.
  const admin = new pg.Client({ connectionString: `${BASE}/postgres` });
  await admin.connect();
  const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [TEST_DB]);
  if (!rowCount) await admin.query(`CREATE DATABASE ${TEST_DB}`);
  await admin.end();

  const pool = new pg.Pool({ connectionString: `${BASE}/${TEST_DB}` });
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
}
