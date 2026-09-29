import { getDb } from "@/db";
import { requireEnv } from "@/lib/env";
import { hasBearerSecret } from "@/lib/request-auth";
import { collectAlio } from "@/lib/services/collect";

// QStash 스케줄이 1시간마다 호출
async function handle(request: Request) {
  if (!hasBearerSecret(request, process.env.CRON_SECRET)) return new Response("Unauthorized", { status: 401 });

  const result = await collectAlio(getDb(), { serviceKey: requireEnv("ALIO_SERVICE_KEY"), now: new Date() });
  console.log("[collect] alio", result);
  return Response.json(result);
}

export { handle as GET, handle as POST };
