import { randomBytes } from "node:crypto";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import type { Db } from "@/db";
import { bookmarks, postings, subscriptions, userSettings } from "@/db/schema";
import type { CalendarPosting } from "@/lib/ics";
import type { SubscriptionFilter } from "@/lib/matching";

const token = () => randomBytes(18).toString("base64url");

export async function getOrCreateSettings(db: Db, userId: string) {
  await db
    .insert(userSettings)
    .values({ userId, telegramLinkToken: token(), calendarToken: token() })
    .onConflictDoNothing();
  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  return settings;
}

/** 텔레그램 /start <linkToken> 처리. 같은 chat이 다른 계정에 연결돼 있으면 옮긴다 */
export async function linkTelegramChat(db: Db, linkToken: string, chatId: string): Promise<boolean> {
  const [target] = await db.select().from(userSettings).where(eq(userSettings.telegramLinkToken, linkToken));
  if (!target) return false;
  await db.update(userSettings).set({ telegramChatId: null }).where(eq(userSettings.telegramChatId, chatId));
  await db.update(userSettings).set({ telegramChatId: chatId }).where(eq(userSettings.userId, target.userId));
  return true;
}

export async function unlinkTelegramChat(db: Db, chatId: string): Promise<void> {
  await db.update(userSettings).set({ telegramChatId: null }).where(eq(userSettings.telegramChatId, chatId));
}

export async function userIdForChat(db: Db, chatId: string): Promise<string | null> {
  const [row] = await db
    .select({ userId: userSettings.userId })
    .from(userSettings)
    .where(eq(userSettings.telegramChatId, chatId));
  return row?.userId ?? null;
}

const clean = (values: string[]) => [...new Set(values.map((v) => v.trim()).filter(Boolean))];

export async function saveSubscription(db: Db, userId: string, filter: SubscriptionFilter): Promise<void> {
  const values = {
    keywords: clean(filter.keywords),
    careerType: filter.careerType,
    regions: clean(filter.regions),
    companies: clean(filter.companies),
    updatedAt: new Date(),
  };
  await db
    .insert(subscriptions)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: subscriptions.userId, set: values });
}

export async function getSubscription(db: Db, userId: string): Promise<SubscriptionFilter | null> {
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  return row ?? null;
}

/** 캘린더 토큰이 틀리면 null */
export async function calendarPostingsForToken(db: Db, calendarToken: string): Promise<CalendarPosting[] | null> {
  const [settings] = await db.select().from(userSettings).where(eq(userSettings.calendarToken, calendarToken));
  if (!settings) return null;

  const rows = await db
    .select({ posting: postings })
    .from(bookmarks)
    .innerJoin(postings, eq(postings.id, bookmarks.postingId))
    .where(and(eq(bookmarks.userId, settings.userId), isNotNull(postings.deadlineAt)))
    .orderBy(asc(postings.deadlineAt));
  return rows.map(({ posting: p }) => ({ ...p, deadlineAt: p.deadlineAt! }));
}
