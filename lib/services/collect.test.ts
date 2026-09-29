import { describe, expect, it, vi } from "vitest";
import { postings } from "@/db/schema";
import { createTestDb } from "@/test/db";
import { collectAlio } from "./collect";

const now = new Date("2026-09-29T12:00:00+09:00");

const item = (sn: number) => ({
  instNm: "기관",
  recrutPblntSn: sn,
  recrutPbancTtl: `공고 ${sn}`,
  recrutSeNm: "신입",
  pbancBgngYmd: "20260928",
  pbancEndYmd: "20261010",
  srcUrl: "",
});

describe("collectAlio", () => {
  it("fetches every page and stores all postings", async () => {
    const db = await createTestDb();
    const pages: Record<string, unknown> = {
      "1": { resultCode: 200, totalCount: 3, result: [item(1), item(2)] },
      "2": { resultCode: 200, totalCount: 3, result: [item(3)] },
    };
    const fetchFn = vi.fn(async (url: string | URL | Request) =>
      Response.json(pages[new URL(String(url)).searchParams.get("pageNo")!]),
    );

    const result = await collectAlio(db, { serviceKey: "k", fetchFn, now, pageSize: 2 });

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ fetched: 3, created: 3, updated: 0 });
    expect(await db.select().from(postings)).toHaveLength(3);
  });

  it("fails loudly on an http error", async () => {
    const db = await createTestDb();
    const fetchFn = vi.fn(async () => new Response("Service Unavailable", { status: 503 }));

    await expect(collectAlio(db, { serviceKey: "k", fetchFn, now })).rejects.toThrow(/503/);
  });
});
