import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { postings, subscriptions } from "@/db/schema";
import { createTestDb, createUser } from "@/test/db";
import { bookmarkPosting } from "./bookmarks";
import {
  calendarPostingsForToken,
  getOrCreateSettings,
  linkTelegramChat,
  saveSubscription,
  unlinkTelegramChat,
} from "./settings";

const now = new Date("2026-09-29T12:00:00+09:00");

describe("user settings", () => {
  let db: Db;
  beforeEach(async () => {
    db = await createTestDb();
    await createUser(db, "u1");
  });

  it("creates settings with unguessable tokens once", async () => {
    const first = await getOrCreateSettings(db, "u1");
    const second = await getOrCreateSettings(db, "u1");

    expect(first.telegramLinkToken).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(first.calendarToken).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(first.calendarToken).not.toBe(first.telegramLinkToken);
    expect(second).toEqual(first);
  });

  it("links a telegram chat by link token", async () => {
    const { telegramLinkToken } = await getOrCreateSettings(db, "u1");

    expect(await linkTelegramChat(db, telegramLinkToken, "42")).toBe(true);
    expect((await getOrCreateSettings(db, "u1")).telegramChatId).toBe("42");
  });

  it("rejects unknown link tokens", async () => {
    expect(await linkTelegramChat(db, "nope", "42")).toBe(false);
  });

  it("moves a chat to the latest account that links it", async () => {
    await createUser(db, "u2");
    await linkTelegramChat(db, (await getOrCreateSettings(db, "u1")).telegramLinkToken, "42");
    await linkTelegramChat(db, (await getOrCreateSettings(db, "u2")).telegramLinkToken, "42");

    expect((await getOrCreateSettings(db, "u1")).telegramChatId).toBeNull();
    expect((await getOrCreateSettings(db, "u2")).telegramChatId).toBe("42");
  });

  it("unlinks a chat", async () => {
    await linkTelegramChat(db, (await getOrCreateSettings(db, "u1")).telegramLinkToken, "42");

    await unlinkTelegramChat(db, "42");

    expect((await getOrCreateSettings(db, "u1")).telegramChatId).toBeNull();
  });

  it("upserts the subscription with trimmed, de-duplicated values", async () => {
    await saveSubscription(db, "u1", { keywords: [" ICT ", "ICT", ""], careerType: "new", regions: [], companies: [] });
    await saveSubscription(db, "u1", { keywords: ["전산"], careerType: "any", regions: ["서울"], companies: ["한전"] });

    const rows = await db.select().from(subscriptions);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ keywords: ["전산"], careerType: "any", regions: ["서울"], companies: ["한전"] });

    await saveSubscription(db, "u1", { keywords: [" ICT ", "ICT", ""], careerType: "new", regions: [], companies: [] });
    expect((await db.select().from(subscriptions))[0].keywords).toEqual(["ICT"]);
  });

  it("lists bookmarked postings with deadlines for a calendar token", async () => {
    const [withDeadline, withoutDeadline] = await db
      .insert(postings)
      .values([
        { source: "alio", sourceId: "1", company: "A", title: "T1", careerType: "new", url: "u", deadlineAt: new Date("2026-10-10T14:59:59Z") },
        { source: "alio", sourceId: "2", company: "B", title: "T2", careerType: "new", url: "u", deadlineAt: null },
      ])
      .returning();
    await bookmarkPosting(db, "u1", withDeadline.id, now);
    await bookmarkPosting(db, "u1", withoutDeadline.id, now);
    const { calendarToken } = await getOrCreateSettings(db, "u1");

    const list = await calendarPostingsForToken(db, calendarToken);

    expect(list?.map((p) => p.title)).toEqual(["T1"]);
    expect(await calendarPostingsForToken(db, "wrong")).toBeNull();
  });
});
