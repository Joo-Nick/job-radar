import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { notificationJobs, postings, subscriptions, userSettings } from "@/db/schema";
import type { PostingInput } from "@/lib/postings";
import { createTestDb, createUser } from "@/test/db";
import { bookmarkPosting } from "./bookmarks";
import { ingestPostings } from "./ingest";

const now = new Date("2026-09-29T12:00:00+09:00");

const input = (overrides: Partial<PostingInput> = {}): PostingInput => ({
  source: "alio",
  sourceId: "100",
  company: "한국전력공사",
  title: "ICT 신입사원 채용",
  careerType: "new",
  regions: ["서울"],
  jobCategories: ["정보통신"],
  openedAt: new Date("2026-09-28T00:00:00+09:00"),
  deadlineAt: new Date("2026-10-10T23:59:59+09:00"),
  deadlineTimeKnown: false,
  url: "https://example.com/100",
  ...overrides,
});

async function subscribe(db: Db, userId: string, keywords: string[], chatId: string | null = `chat-${userId}`) {
  await createUser(db, userId);
  await db.insert(subscriptions).values({ userId, keywords });
  await db
    .insert(userSettings)
    .values({ userId, telegramChatId: chatId, telegramLinkToken: `link-${userId}`, calendarToken: `cal-${userId}` });
}

describe("ingestPostings", () => {
  let db: Db;
  beforeEach(async () => {
    db = await createTestDb();
  });

  it("stores new postings and reports them as new", async () => {
    const result = await ingestPostings(db, [input()], now);

    expect(result).toEqual({ created: 1, updated: 0 });
    expect(await db.select().from(postings)).toHaveLength(1);
  });

  it("does not duplicate postings seen again", async () => {
    await ingestPostings(db, [input()], now);
    const result = await ingestPostings(db, [input()], now);

    expect(result).toEqual({ created: 0, updated: 0 });
    expect(await db.select().from(postings)).toHaveLength(1);
  });

  it("queues a new-posting alert for matching subscribers with telegram linked", async () => {
    await subscribe(db, "match", ["ICT"]);
    await subscribe(db, "nomatch", ["회계"]);
    await subscribe(db, "unlinked", ["ICT"], null);

    await ingestPostings(db, [input()], now);

    const jobs = await db.select().from(notificationJobs);
    expect(jobs.map((j) => [j.userId, j.kind, j.status])).toEqual([["match", "new", "pending"]]);
    expect(jobs[0].sendAt).toEqual(now);
  });

  it("does not alert on postings opened long ago, so the first crawl does not flood users", async () => {
    await subscribe(db, "match", ["ICT"]);

    await ingestPostings(db, [input({ openedAt: new Date("2026-09-01T00:00:00+09:00") })], now);

    expect(await db.select().from(notificationJobs)).toHaveLength(0);
  });

  it("does not alert on postings already past their deadline", async () => {
    await subscribe(db, "match", ["ICT"]);

    await ingestPostings(db, [input({ deadlineAt: new Date("2026-09-29T09:00:00+09:00") })], now);

    expect(await db.select().from(notificationJobs)).toHaveLength(0);
  });

  it("reschedules bookmarked reminders when a deadline is extended", async () => {
    await subscribe(db, "u1", ["회계"]);
    await ingestPostings(db, [input()], now);
    const [posting] = await db.select().from(postings);
    await bookmarkPosting(db, "u1", posting.id, now);

    const extended = new Date("2026-10-17T23:59:59+09:00");
    const result = await ingestPostings(db, [input({ deadlineAt: extended })], now);

    expect(result).toEqual({ created: 0, updated: 1 });
    const [updated] = await db.select().from(postings).where(eq(postings.id, posting.id));
    expect(updated.deadlineAt).toEqual(extended);
    const d0 = (await db.select().from(notificationJobs)).find((j) => j.kind === "D-0");
    expect(d0?.sendAt).toEqual(new Date("2026-10-17T09:00:00+09:00"));
    expect(d0?.status).toBe("pending");
  });
});
