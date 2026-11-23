import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: { alias: { "@": resolve(__dirname, "src") } },
  test: {
    globalSetup: ["./test/global-setup.ts"],
    env: { DATABASE_URL: "postgres://dou:dou@localhost:5433/dou_alerts" },
    // Tests share one database, so run files serially.
    fileParallelism: false,
  },
});
