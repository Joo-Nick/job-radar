import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Db } from "@/db";
import * as schema from "@/db/schema";

/** 테스트마다 격리된 인메모리 Postgres */
export async function createTestDb(): Promise<Db> {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: "db/migrations" });
  return db;
}

export async function createUser(db: Db, id = "u1"): Promise<string> {
  await db.insert(schema.user).values({ id, name: id, email: `${id}@example.com` });
  return id;
}
