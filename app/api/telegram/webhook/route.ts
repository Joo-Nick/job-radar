import { getDb } from "@/db";
import { requireEnv } from "@/lib/env";
import { hasHeaderSecret } from "@/lib/request-auth";
import { handleTelegramUpdate, type TelegramUpdate } from "@/lib/services/telegram-webhook";
import { answerCallbackQuery, sendTelegramMessage } from "@/lib/telegram";

export async function POST(request: Request) {
  if (!hasHeaderSecret(request, "x-telegram-bot-api-secret-token", process.env.TELEGRAM_WEBHOOK_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const token = requireEnv("TELEGRAM_BOT_TOKEN");
  const update = (await request.json()) as TelegramUpdate;
  try {
    await handleTelegramUpdate(getDb(), update, {
      now: new Date(),
      reply: (chatId, text) => sendTelegramMessage({ token, chatId, message: { text, buttons: [] } }),
      answer: (callbackQueryId, text) => answerCallbackQuery({ token, callbackQueryId, text }),
    });
  } catch (error) {
    // 200이 아니면 텔레그램이 같은 업데이트를 계속 재전송하므로 로그만 남기고 성공 응답
    console.error("[telegram webhook]", error);
  }
  return new Response("ok");
}
