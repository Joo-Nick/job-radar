import { and, asc, eq, inArray, lt, lte, or, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { notificationJobs, postings, userSettings } from "@/db/schema";
import { newPostingMessage, reminderMessage, type TelegramMessage } from "@/lib/telegram";

export type SendFn = (chatId: string, message: TelegramMessage) => Promise<void>;

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5 * 60 * 1000;
const STALE_CLAIM_MS = 10 * 60 * 1000;
const BATCH_SIZE = 100;

export async function dispatchDueNotifications(
  db: Db,
  now: Date,
  send: SendFn,
): Promise<{ sent: number; failed: number }> {
  // 선점: 한 문장 UPDATE로 pending → sending. 겹쳐 실행돼도 같은 job을 두 번 잡지 않는다
  const due = db
    .select({ id: notificationJobs.id })
    .from(notificationJobs)
    .where(
      or(
        and(eq(notificationJobs.status, "pending"), lte(notificationJobs.sendAt, now)),
        and(
          eq(notificationJobs.status, "sending"),
          lt(notificationJobs.claimedAt, new Date(now.getTime() - STALE_CLAIM_MS)),
        ),
      ),
    )
    .orderBy(asc(notificationJobs.sendAt))
    .limit(BATCH_SIZE)
    .for("update", { skipLocked: true });

  const claimed = await db
    .update(notificationJobs)
    .set({ status: "sending", claimedAt: now, attempts: sql`${notificationJobs.attempts} + 1` })
    .where(inArray(notificationJobs.id, due))
    .returning();
  if (claimed.length === 0) return { sent: 0, failed: 0 };

  const rows = await db
    .select({ jobId: notificationJobs.id, posting: postings, chatId: userSettings.telegramChatId })
    .from(notificationJobs)
    .innerJoin(postings, eq(postings.id, notificationJobs.postingId))
    .leftJoin(userSettings, eq(userSettings.userId, notificationJobs.userId))
    .where(inArray(notificationJobs.id, claimed.map((j) => j.id)));
  const byJob = new Map(rows.map((r) => [r.jobId, r]));

  let sent = 0;
  let failed = 0;
  for (const job of claimed) {
    const row = byJob.get(job.id);
    if (!row?.chatId) {
      await db.update(notificationJobs).set({ status: "canceled" }).where(eq(notificationJobs.id, job.id));
      continue;
    }

    const message = job.kind === "new" ? newPostingMessage(row.posting) : reminderMessage(row.posting, job.kind);
    try {
      await send(row.chatId, message);
      await db.update(notificationJobs).set({ status: "sent", sentAt: now }).where(eq(notificationJobs.id, job.id));
      sent++;
    } catch (error) {
      failed++;
      const giveUp = job.attempts >= MAX_ATTEMPTS;
      await db
        .update(notificationJobs)
        .set({
          status: giveUp ? "failed" : "pending",
          sendAt: giveUp ? job.sendAt : new Date(now.getTime() + RETRY_DELAY_MS),
          lastError: error instanceof Error ? error.message : String(error),
        })
        .where(eq(notificationJobs.id, job.id));
    }
  }
  return { sent, failed };
}
