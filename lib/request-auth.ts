import { timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function hasHeaderSecret(request: Request, header: string, secret: string | undefined): boolean {
  const value = request.headers.get(header);
  return Boolean(secret) && value !== null && safeEqual(value, secret!);
}

/** 크론 호출 인증: Authorization: Bearer <CRON_SECRET> */
export function hasBearerSecret(request: Request, secret: string | undefined): boolean {
  const value = request.headers.get("authorization");
  return Boolean(secret) && value !== null && safeEqual(value, `Bearer ${secret}`);
}
