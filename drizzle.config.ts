import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: [".env.local", ".env"], quiet: true });

const url = process.env.DATABASE_URL ?? "";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  // 로컬 개발(file:)은 PGlite, 그 외는 Neon
  ...(url.startsWith("file:")
    ? { driver: "pglite", dbCredentials: { url: url.slice("file:".length) } }
    : { dbCredentials: { url } }),
});
