import { getDb } from "@/db";
import { requireEnv } from "@/lib/env";
import { hasBearerSecret } from "@/lib/request-auth";
import { dispatchDueNotifications } from "@/lib/services/dispatch";
import { sendTelegramMessage } from "@/lib/telegram";

// QStash 스케줄이 5분마다 호출
async function handle(request: Request) {
  if (!hasBearerSecret(request, process.env.CRON_SECRET)) return new Response("Unauthorized", { status: 401 });

  const token = requireEnv("TELEGRAM_BOT_TOKEN");
  const result = await dispatchDueNotifications(getDb(), new Date(), (chatId, message) =>
    sendTelegramMessage({ token, chatId, message }),
  );
  console.log("[dispatch]", result);
  return Response.json(result);
}

export { handle as GET, handle as POST };
