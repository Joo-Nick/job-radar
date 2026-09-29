import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
function createAuth() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  return betterAuth({
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    // OAuth 키를 넣기 전에도 랜딩 페이지는 뜨도록 키가 있을 때만 등록
    socialProviders:
      GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
        ? { google: { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET } }
        : {},
    plugins: [nextCookies()],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

/** 빌드 시 env 없이도 import 되도록 지연 생성 */
export function getAuth() {
  return (instance ??= createAuth());
}

export async function getSessionUser() {
  // headers()를 먼저 호출해야 빌드 때 동적 렌더링으로 빠진다 (env 없이 DB 초기화 방지)
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  return session?.user ?? null;
}
