import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

let instance: Db | undefined;

export function getDb(): Db {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    instance = url.startsWith("file:") ? localDb(url.slice("file:".length)) : drizzle(neon(url), { schema });
  }
  return instance;
}

/**
 * 로컬 개발용: DATABASE_URL=file:./.pglite 면 파일 기반 PGlite 사용.
 * dev 서버는 라우트·페이지를 별도 모듈 인스턴스로 로드하므로 프로세스 전역에서 하나만 연다
 */
function localDb(dataDir: string): Db {
  const g = globalThis as typeof globalThis & { __localDb?: Db };
  if (!g.__localDb) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PGlite } = require("@electric-sql/pglite") as typeof import("@electric-sql/pglite");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle: drizzlePglite } = require("drizzle-orm/pglite") as typeof import("drizzle-orm/pglite");
    g.__localDb = drizzlePglite(new PGlite(dataDir), { schema });
  }
  return g.__localDb;
}
