import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { postings } from "@/db/schema";
import { bookmarkPosting } from "./bookmarks";
import { linkTelegramChat, unlinkTelegramChat, userIdForChat } from "./settings";

type Chat = { id: number | string };
export type TelegramUpdate = {
  message?: { chat: Chat; text?: string };
  callback_query?: { id: string; data?: string; message?: { chat: Chat } };
  my_chat_member?: { chat: Chat; new_chat_member: { status: string } };
};

type Deps = {
  reply: (chatId: string, text: string) => Promise<void>;
  answer: (callbackQueryId: string, text: string) => Promise<void>;
  now: Date;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function handleTelegramUpdate(db: Db, update: TelegramUpdate, deps: Deps): Promise<void> {
  if (update.message?.text) {
    const chatId = String(update.message.chat.id);
    const [command, arg] = update.message.text.trim().split(/\s+/, 2);

    if (command === "/start") {
      const linked = arg ? await linkTelegramChat(db, arg, chatId) : false;
      await deps.reply(
        chatId,
        linked
          ? "✅ 연결됐어요! 조건에 맞는 새 공고와 마감 알림을 여기로 보내드릴게요.\n알림을 끄려면 /stop"
          : "웹사이트 설정 페이지에서 [텔레그램 연결] 버튼을 눌러 연결해주세요.",
      );
    } else if (command === "/stop") {
      await unlinkTelegramChat(db, chatId);
      await deps.reply(chatId, "알림을 껐어요. 다시 받으려면 설정 페이지에서 연결해주세요.");
    }
    return;
  }

  if (update.my_chat_member?.new_chat_member.status === "kicked") {
    await unlinkTelegramChat(db, String(update.my_chat_member.chat.id));
    return;
  }

  const cb = update.callback_query;
  if (cb?.data?.startsWith("bm:") && cb.message) {
    const postingId = cb.data.slice(3);
    const userId = await userIdForChat(db, String(cb.message.chat.id));
    if (!userId) {
      await deps.answer(cb.id, "먼저 웹사이트에서 텔레그램을 연결해주세요.");
      return;
    }
    const exists =
      UUID.test(postingId) &&
      (await db.select({ id: postings.id }).from(postings).where(eq(postings.id, postingId))).length > 0;
    if (!exists) {
      await deps.answer(cb.id, "공고를 찾을 수 없어요.");
      return;
    }
    await bookmarkPosting(db, userId, postingId, deps.now);
    await deps.answer(cb.id, "⭐ 관심 등록! 마감 알림과 캘린더에 추가했어요.");
  }
}
