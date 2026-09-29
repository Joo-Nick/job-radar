import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { postings } from "@/db/schema";
import { createTestDb, createUser } from "@/test/db";
import { bookmarkPosting } from "./bookmarks";
import { listOpenPostings } from "./postings-query";

const now = new Date("2026-09-29T12:00:00+09:00");

describe("listOpenPostings", () => {
  let db: Db;
  beforeEach(async () => {
    db = await createTestDb();
    await createUser(db, "u1");
    const base = { source: "alio", company: "기관", careerType: "new" as const, url: "u" };
    await db.insert(postings).values([
      { ...base, sourceId: "late", title: "ICT 늦은 마감", deadlineAt: new Date("2026-10-20T14:59:59Z") },
      { ...base, sourceId: "soon", title: "ICT 곧 마감", deadlineAt: new Date("2026-10-01T14:59:59Z") },
      { ...base, sourceId: "closed", title: "ICT 마감됨", deadlineAt: new Date("2026-09-28T14:59:59Z") },
      { ...base, sourceId: "open", title: "회계 상시", deadlineAt: null },
    ]);
  });

  it("lists open postings, soonest deadline first and open-ended last", async () => {
    const list = await listOpenPostings(db, { userId: "u1", filter: null, now });

    expect(list.map((p) => p.sourceId)).toEqual(["soon", "late", "open"]);
  });

  it("applies the subscription filter when given", async () => {
    const filter = { keywords: ["ICT"], careerType: "any" as const, regions: [], companies: [] };

    const list = await listOpenPostings(db, { userId: "u1", filter, now });

    expect(list.map((p) => p.sourceId)).toEqual(["soon", "late"]);
  });

  it("marks the user's bookmarks", async () => {
    const [late] = (await db.select().from(postings)).filter((p) => p.sourceId === "late");
    await bookmarkPosting(db, "u1", late.id, now);

    const list = await listOpenPostings(db, { userId: "u1", filter: null, now });

    expect(list.filter((p) => p.bookmarked).map((p) => p.sourceId)).toEqual(["late"]);
  });
});
