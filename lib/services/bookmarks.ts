import { and, eq, inArray, ne, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { bookmarks, notificationJobs, postings } from "@/db/schema";
import { planDeadlineReminders } from "@/lib/reminders";

const REMINDER_KINDS = ["D-3", "D-1", "D-0"] as const;

/** 기존 마감 알림을 취소하고 현재 마감일 기준으로 다시 예약한다 */
export async function scheduleReminders(
  db: Db,
  userIds: string[],
  posting: { id: string; deadlineAt: Date | null },
  now: Date,
): Promise<void> {
  if (userIds.length === 0) return;

  await db
    .update(notificationJobs)
    .set({ status: "canceled" })
    .where(
      and(
        eq(notificationJobs.postingId, posting.id),
        inArray(notificationJobs.userId, userIds),
        inArray(notificationJobs.kind, [...REMINDER_KINDS]),
        eq(notificationJobs.status, "pending"),
      ),
    );

  if (!posting.deadlineAt) return;
  const plan = planDeadlineReminders(posting.deadlineAt, now);
  if (plan.length === 0) return;

  await db
    .insert(notificationJobs)
    .values(userIds.flatMap((userId) => plan.map(({ kind, sendAt }) => ({ userId, postingId: posting.id, kind, sendAt }))))
    .onConflictDoUpdate({
      target: [notificationJobs.userId, notificationJobs.postingId, notificationJobs.kind],
      set: {
        sendAt: sql`excluded.send_at`,
        status: "pending",
        attempts: 0,
        claimedAt: null,
        sentAt: null,
        lastError: null,
      },
      // 발송 중인 건은 건드리지 않는다
      setWhere: ne(notificationJobs.status, "sending"),
    });
}

/** @returns 새로 등록했으면 true, 이미 등록돼 있었으면 false */
export async function bookmarkPosting(db: Db, userId: string, postingId: string, now: Date): Promise<boolean> {
  const inserted = await db.insert(bookmarks).values({ userId, postingId }).onConflictDoNothing().returning();
  if (inserted.length === 0) return false;

  const [posting] = await db
    .select({ id: postings.id, deadlineAt: postings.deadlineAt })
    .from(postings)
    .where(eq(postings.id, postingId));
  await scheduleReminders(db, [userId], posting, now);
  return true;
}

export async function removeBookmark(db: Db, userId: string, postingId: string): Promise<void> {
  await db.delete(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.postingId, postingId)));
  await db
    .update(notificationJobs)
    .set({ status: "canceled" })
    .where(
      and(
        eq(notificationJobs.userId, userId),
        eq(notificationJobs.postingId, postingId),
        inArray(notificationJobs.kind, [...REMINDER_KINDS]),
        eq(notificationJobs.status, "pending"),
      ),
    );
}
