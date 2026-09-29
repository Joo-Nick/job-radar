import { and, eq, inArray, isNotNull } from "drizzle-orm";
import type { Db } from "@/db";
import { bookmarks, notificationJobs, postings, subscriptions, userSettings } from "@/db/schema";
import { matchesSubscription } from "@/lib/matching";
import type { PostingInput } from "@/lib/postings";
import { scheduleReminders } from "./bookmarks";

/** 공고 시작일이 이보다 오래된 공고는 "새 공고" 알림을 보내지 않는다 (첫 수집 때 알림 폭탄 방지) */
const NEW_ALERT_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

type PostingRow = typeof postings.$inferSelect;

const time = (d: Date | null) => d?.getTime() ?? null;

function hasChanged(row: PostingRow, input: PostingInput): boolean {
  return (
    row.title !== input.title ||
    row.company !== input.company ||
    row.url !== input.url ||
    row.careerType !== input.careerType ||
    time(row.deadlineAt) !== time(input.deadlineAt) ||
    row.deadlineTimeKnown !== input.deadlineTimeKnown ||
    row.regions.join(",") !== input.regions.join(",") ||
    row.jobCategories.join(",") !== input.jobCategories.join(",")
  );
}

export async function ingestPostings(
  db: Db,
  inputs: PostingInput[],
  now: Date,
): Promise<{ created: number; updated: number }> {
  const unique = [...new Map(inputs.map((p) => [`${p.source}:${p.sourceId}`, p])).values()];
  if (unique.length === 0) return { created: 0, updated: 0 };

  const source = unique[0].source;
  const existing = new Map(
    (
      await db
        .select()
        .from(postings)
        .where(and(eq(postings.source, source), inArray(postings.sourceId, unique.map((p) => p.sourceId))))
    ).map((row) => [row.sourceId, row]),
  );

  const fresh = unique.filter((p) => !existing.has(p.sourceId));
  const created = fresh.length > 0 ? await db.insert(postings).values(fresh).onConflictDoNothing().returning() : [];

  let updated = 0;
  for (const input of unique) {
    const row = existing.get(input.sourceId);
    if (!row || !hasChanged(row, input)) continue;
    updated++;
    await db.update(postings).set(input).where(eq(postings.id, row.id));
    if (time(row.deadlineAt) !== time(input.deadlineAt)) {
      const users = await db.select({ userId: bookmarks.userId }).from(bookmarks).where(eq(bookmarks.postingId, row.id));
      await scheduleReminders(db, users.map((u) => u.userId), { id: row.id, deadlineAt: input.deadlineAt }, now);
    }
  }

  await queueNewPostingAlerts(db, created, now);
  return { created: created.length, updated };
}

async function queueNewPostingAlerts(db: Db, created: PostingRow[], now: Date): Promise<void> {
  const alertable = created.filter(
    (p) =>
      (!p.openedAt || now.getTime() - p.openedAt.getTime() <= NEW_ALERT_WINDOW_MS) &&
      (!p.deadlineAt || p.deadlineAt > now),
  );
  if (alertable.length === 0) return;

  const subs = await db
    .select({ sub: subscriptions })
    .from(subscriptions)
    .innerJoin(userSettings, eq(userSettings.userId, subscriptions.userId))
    .where(isNotNull(userSettings.telegramChatId));

  const jobs = alertable.flatMap((posting) =>
    subs
      .filter(({ sub }) => matchesSubscription(posting, sub))
      .map(({ sub }) => ({ userId: sub.userId, postingId: posting.id, kind: "new" as const, sendAt: now })),
  );
  if (jobs.length > 0) await db.insert(notificationJobs).values(jobs).onConflictDoNothing();
}
