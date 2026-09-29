import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { Db } from "@/db";
import { bookmarks, postings } from "@/db/schema";
import { createTestDb, createUser } from "@/test/db";
import { getOrCreateSettings, linkTelegramChat } from "./settings";
import { handleTelegramUpdate } from "./telegram-webhook";

const now = new Date("2026-09-29T12:00:00+09:00");

describe("handleTelegramUpdate", () => {
  let db: Db;
  let reply: Mock<(chatId: string, text: string) => Promise<void>>;
  let answer: Mock<(callbackQueryId: string, text: string) => Promise<void>>;
  const deps = () => ({ reply, answer, now });

  beforeEach(async () => {
    db = await createTestDb();
    await createUser(db, "u1");
    reply = vi.fn(async () => {});
    answer = vi.fn(async () => {});
  });

  const message = (text: string) => ({ message: { chat: { id: 42 }, text } });

  it("links the account from a /start deep link", async () => {
    const { telegramLinkToken } = await getOrCreateSettings(db, "u1");

    await handleTelegramUpdate(db, message(`/start ${telegramLinkToken}`), deps());

    expect((await getOrCreateSettings(db, "u1")).telegramChatId).toBe("42");
    expect(reply).toHaveBeenCalledWith("42", expect.stringContaining("연결"));
  });

  it("tells the user to connect from the website when the token is missing or wrong", async () => {
    await handleTelegramUpdate(db, message("/start wrong"), deps());

    expect(reply).toHaveBeenCalledWith("42", expect.stringContaining("설정"));
    expect((await getOrCreateSettings(db, "u1")).telegramChatId).toBeNull();
  });

  it("unlinks on /stop", async () => {
    await linkTelegramChat(db, (await getOrCreateSettings(db, "u1")).telegramLinkToken, "42");

    await handleTelegramUpdate(db, message("/stop"), deps());

    expect((await getOrCreateSettings(db, "u1")).telegramChatId).toBeNull();
  });

  it("unlinks when the user blocks the bot", async () => {
    await linkTelegramChat(db, (await getOrCreateSettings(db, "u1")).telegramLinkToken, "42");

    await handleTelegramUpdate(db, { my_chat_member: { chat: { id: 42 }, new_chat_member: { status: "kicked" } } }, deps());

    expect((await getOrCreateSettings(db, "u1")).telegramChatId).toBeNull();
  });

  it("bookmarks a posting from the inline button", async () => {
    await linkTelegramChat(db, (await getOrCreateSettings(db, "u1")).telegramLinkToken, "42");
    const [p] = await db
      .insert(postings)
      .values({ source: "alio", sourceId: "1", company: "A", title: "T", careerType: "new", url: "u" })
      .returning();

    await handleTelegramUpdate(
      db,
      { callback_query: { id: "cb1", data: `bm:${p.id}`, message: { chat: { id: 42 } } } },
      deps(),
    );

    expect(await db.select().from(bookmarks)).toEqual([expect.objectContaining({ userId: "u1", postingId: p.id })]);
    expect(answer).toHaveBeenCalledWith("cb1", expect.stringContaining("관심 등록"));
  });

  it("answers gracefully for a stale or malformed button", async () => {
    await linkTelegramChat(db, (await getOrCreateSettings(db, "u1")).telegramLinkToken, "42");

    await handleTelegramUpdate(
      db,
      { callback_query: { id: "cb1", data: "bm:not-a-uuid", message: { chat: { id: 42 } } } },
      deps(),
    );

    expect(answer).toHaveBeenCalledWith("cb1", expect.stringContaining("찾을 수 없"));
  });
});
