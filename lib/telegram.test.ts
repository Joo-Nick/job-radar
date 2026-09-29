import { describe, expect, it, vi } from "vitest";
import { formatDeadline, newPostingMessage, reminderMessage, sendTelegramMessage } from "./telegram";

const posting = {
  id: "p1",
  company: "한국<전력>&공사",
  title: "신입사원 채용",
  url: "https://example.com/1",
  deadlineAt: new Date("2026-10-10T23:59:59+09:00"),
  deadlineTimeKnown: false,
};

describe("formatDeadline", () => {
  it("shows the KST date and weekday", () => {
    expect(formatDeadline(posting.deadlineAt, false)).toBe("10/10(토)");
  });

  it("adds the KST time when it is known", () => {
    expect(formatDeadline(new Date("2026-10-10T09:00:00Z"), true)).toBe("10/10(토) 18:00");
  });
});

describe("newPostingMessage", () => {
  it("escapes html and offers bookmark and open buttons", () => {
    const msg = newPostingMessage(posting);

    expect(msg.text).toBe("🆕 새 공고\n<b>한국&lt;전력&gt;&amp;공사</b>\n신입사원 채용\n마감 10/10(토)");
    expect(msg.buttons).toEqual([
      { text: "관심 등록", callbackData: "bm:p1" },
      { text: "공고 보기", url: "https://example.com/1" },
    ]);
  });

  it("says when there is no deadline", () => {
    expect(newPostingMessage({ ...posting, deadlineAt: null }).text).toContain("마감 채용시까지");
  });
});

describe("reminderMessage", () => {
  it("labels same-day reminders as today", () => {
    expect(reminderMessage(posting, "D-0").text.split("\n")[0]).toBe("⏰ 오늘 마감");
    expect(reminderMessage(posting, "D-3").text.split("\n")[0]).toBe("⏰ 마감 D-3");
  });
});

describe("sendTelegramMessage", () => {
  it("posts html text with an inline keyboard to the bot api", async () => {
    const fetchFn = vi.fn(async () => Response.json({ ok: true }));

    await sendTelegramMessage({ token: "T", chatId: "42", message: newPostingMessage(posting), fetchFn });

    expect(fetchFn).toHaveBeenCalledWith("https://api.telegram.org/botT/sendMessage", expect.anything());
    const body = JSON.parse((fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toMatchObject({
      chat_id: "42",
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "관심 등록", callback_data: "bm:p1" }, { text: "공고 보기", url: "https://example.com/1" }]],
      },
    });
  });

  it("throws with the telegram description when the api fails", async () => {
    const fetchFn = vi.fn(async () => Response.json({ ok: false, description: "Forbidden: bot was blocked" }, { status: 403 }));

    await expect(
      sendTelegramMessage({ token: "T", chatId: "42", message: { text: "x", buttons: [] }, fetchFn }),
    ).rejects.toThrow(/bot was blocked/);
  });
});
