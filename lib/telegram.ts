import type { ReminderKind } from "@/lib/reminders";

export type Button = { text: string; callbackData: string } | { text: string; url: string };
export type TelegramMessage = { text: string; buttons: Button[] };

type MessagePosting = {
  id: string;
  company: string;
  title: string;
  url: string;
  deadlineAt: Date | null;
  deadlineTimeKnown: boolean;
};

type FetchFn = typeof fetch;

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function formatDeadline(deadlineAt: Date, timeKnown: boolean): string {
  const kst = new Date(deadlineAt.getTime() + 9 * 60 * 60 * 1000);
  const date = `${kst.getUTCMonth() + 1}/${kst.getUTCDate()}(${WEEKDAYS[kst.getUTCDay()]})`;
  if (!timeKnown) return date;
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const mm = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${date} ${hh}:${mm}`;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function body(p: MessagePosting): string {
  const deadline = p.deadlineAt ? formatDeadline(p.deadlineAt, p.deadlineTimeKnown) : "채용시까지";
  return `<b>${escapeHtml(p.company)}</b>\n${escapeHtml(p.title)}\n마감 ${deadline}`;
}

export function newPostingMessage(p: MessagePosting): TelegramMessage {
  return {
    text: `🆕 새 공고\n${body(p)}`,
    buttons: [
      { text: "관심 등록", callbackData: `bm:${p.id}` },
      { text: "공고 보기", url: p.url },
    ],
  };
}

export function reminderMessage(p: MessagePosting, kind: ReminderKind): TelegramMessage {
  const header = kind === "D-0" ? "⏰ 오늘 마감" : `⏰ 마감 ${kind}`;
  return { text: `${header}\n${body(p)}`, buttons: [{ text: "공고 보기", url: p.url }] };
}

async function callApi(token: string, method: string, payload: unknown, fetchFn: FetchFn): Promise<unknown> {
  const res = await fetchFn(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as { ok: boolean; description?: string; result?: unknown };
  if (!json.ok) throw new Error(`telegram ${method} failed: ${json.description ?? res.status}`);
  return json.result;
}

export async function sendTelegramMessage(opts: {
  token: string;
  chatId: string;
  message: TelegramMessage;
  fetchFn?: FetchFn;
}): Promise<void> {
  const { token, chatId, message, fetchFn = fetch } = opts;
  const keyboard = message.buttons.map((b) =>
    "url" in b ? { text: b.text, url: b.url } : { text: b.text, callback_data: b.callbackData },
  );
  await callApi(
    token,
    "sendMessage",
    {
      chat_id: chatId,
      text: message.text,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      ...(keyboard.length > 0 && { reply_markup: { inline_keyboard: [keyboard] } }),
    },
    fetchFn,
  );
}

export async function answerCallbackQuery(opts: {
  token: string;
  callbackQueryId: string;
  text: string;
  fetchFn?: FetchFn;
}): Promise<void> {
  const { token, callbackQueryId, text, fetchFn = fetch } = opts;
  await callApi(token, "answerCallbackQuery", { callback_query_id: callbackQueryId, text }, fetchFn);
}
