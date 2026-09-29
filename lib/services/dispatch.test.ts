import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db";
import { notificationJobs, postings, userSettings } from "@/db/schema";
import { createTestDb, createUser } from "@/test/db";
import { dispatchDueNotifications } from "./dispatch";

const now = new Date("2026-10-07T09:00:00+09:00");
const MINUTE = 60 * 1000;

describe("dispatchDueNotifications", () => {
  let db: Db;
  let postingId: string;

  beforeEach(async () => {
    db = await createTestDb();
    await createUser(db, "u1");
    await db.insert(userSettings).values({ userId: "u1", telegramChatId: "42", telegramLinkToken: "l", calendarToken: "c" });
    const [p] = await db
      .insert(postings)
      .values({
        source: "alio",
        sourceId: "1",
        company: "한국전력공사",
        title: "신입 채용",
        careerType: "new",
        deadlineAt: new Date("2026-10-10T23:59:59+09:00"),
        url: "https://example.com/1",
      })
      .returning();
    postingId = p.id;
  });

  const addJob = (kind: "new" | "D-3", sendAt: Date, extra: Partial<typeof notificationJobs.$inferInsert> = {}) =>
    db.insert(notificationJobs).values({ userId: "u1", postingId, kind, sendAt, ...extra });

  it("sends due jobs to the linked chat and marks them sent", async () => {
    await addJob("D-3", now);
    const send = vi.fn(async () => {});

    const result = await dispatchDueNotifications(db, now, send);

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(send).toHaveBeenCalledWith("42", expect.objectContaining({ text: expect.stringContaining("⏰ 마감 D-3") }));
    const [job] = await db.select().from(notificationJobs);
    expect(job.status).toBe("sent");
    expect(job.sentAt).toEqual(now);
  });

  it("leaves future jobs alone", async () => {
    await addJob("D-3", new Date(now.getTime() + MINUTE));
    const send = vi.fn(async () => {});

    await dispatchDueNotifications(db, now, send);

    expect(send).not.toHaveBeenCalled();
  });

  it("never sends the same job twice when runs overlap", async () => {
    await addJob("D-3", now);
    const send = vi.fn(async () => {});

    await Promise.all([dispatchDueNotifications(db, now, send), dispatchDueNotifications(db, now, send)]);

    expect(send).toHaveBeenCalledTimes(1);
  });

  it("retries a failed send five minutes later", async () => {
    await addJob("D-3", now);
    const send = vi.fn(async () => {
      throw new Error("timeout");
    });

    const result = await dispatchDueNotifications(db, now, send);

    expect(result).toEqual({ sent: 0, failed: 1 });
    const [job] = await db.select().from(notificationJobs);
    expect(job.status).toBe("pending");
    expect(job.attempts).toBe(1);
    expect(job.sendAt).toEqual(new Date(now.getTime() + 5 * MINUTE));
    expect(job.lastError).toBe("timeout");
  });

  it("gives up after three attempts", async () => {
    await addJob("D-3", now, { attempts: 2 });
    const send = vi.fn(async () => {
      throw new Error("timeout");
    });

    await dispatchDueNotifications(db, now, send);

    const [job] = await db.select().from(notificationJobs);
    expect(job.status).toBe("failed");
  });

  it("cancels jobs for users who unlinked telegram", async () => {
    await db.update(userSettings).set({ telegramChatId: null });
    await addJob("new", now);
    const send = vi.fn(async () => {});

    await dispatchDueNotifications(db, now, send);

    expect(send).not.toHaveBeenCalled();
    const [job] = await db.select().from(notificationJobs);
    expect(job.status).toBe("canceled");
  });

  it("reclaims jobs stuck in sending after a crash", async () => {
    await addJob("D-3", now, { status: "sending", claimedAt: new Date(now.getTime() - 11 * MINUTE), attempts: 1 });
    const send = vi.fn(async () => {});

    await dispatchDueNotifications(db, now, send);

    expect(send).toHaveBeenCalledTimes(1);
  });
});
