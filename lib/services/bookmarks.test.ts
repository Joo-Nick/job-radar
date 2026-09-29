import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { bookmarks, notificationJobs, postings } from "@/db/schema";
import { createTestDb, createUser } from "@/test/db";
import { bookmarkPosting, removeBookmark } from "./bookmarks";

const now = new Date("2026-09-29T12:00:00+09:00");

async function insertPosting(db: Db, deadlineAt: Date | null = new Date("2026-10-10T23:59:59+09:00")) {
  const [p] = await db
    .insert(postings)
    .values({
      source: "alio",
      sourceId: "1",
      company: "A",
      title: "T",
      careerType: "new",
      deadlineAt,
      url: "https://example.com",
    })
    .returning();
  return p.id;
}

describe("bookmarkPosting", () => {
  let db: Db;
  beforeEach(async () => {
    db = await createTestDb();
    await createUser(db, "u1");
  });

  it("saves the bookmark and schedules deadline reminders", async () => {
    const postingId = await insertPosting(db);

    expect(await bookmarkPosting(db, "u1", postingId, now)).toBe(true);

    expect(await db.select().from(bookmarks)).toHaveLength(1);
    const jobs = await db.select().from(notificationJobs);
    expect(jobs.map((j) => j.kind).sort()).toEqual(["D-0", "D-1", "D-3"]);
    expect(jobs.every((j) => j.status === "pending")).toBe(true);
  });

  it("is idempotent", async () => {
    const postingId = await insertPosting(db);
    await bookmarkPosting(db, "u1", postingId, now);

    expect(await bookmarkPosting(db, "u1", postingId, now)).toBe(false);
    expect(await db.select().from(notificationJobs)).toHaveLength(3);
  });

  it("schedules nothing for postings without a deadline", async () => {
    const postingId = await insertPosting(db, null);
    await bookmarkPosting(db, "u1", postingId, now);

    expect(await db.select().from(notificationJobs)).toHaveLength(0);
  });
});

describe("removeBookmark", () => {
  it("deletes the bookmark and cancels pending reminders", async () => {
    const db = await createTestDb();
    await createUser(db, "u1");
    const postingId = await insertPosting(db);
    await bookmarkPosting(db, "u1", postingId, now);

    await removeBookmark(db, "u1", postingId);

    expect(await db.select().from(bookmarks)).toHaveLength(0);
    const jobs = await db.select().from(notificationJobs);
    expect(jobs.every((j) => j.status === "canceled")).toBe(true);
  });
});
