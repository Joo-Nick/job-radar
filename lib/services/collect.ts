import type { Db } from "@/db";
import type { PostingInput } from "@/lib/postings";
import { buildAlioListUrl, parseAlioListResponse } from "@/lib/sources/alio";
import { ingestPostings } from "./ingest";

// 개발계정 하루 1,000회 한도. 100건씩이면 진행 중 공고 전체가 한 번에 10회 안팎
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGES = 30;

export async function collectAlio(
  db: Db,
  opts: { serviceKey: string; now: Date; fetchFn?: typeof fetch; pageSize?: number },
): Promise<{ fetched: number; created: number; updated: number }> {
  const { serviceKey, now, fetchFn = fetch, pageSize = DEFAULT_PAGE_SIZE } = opts;
  const all: PostingInput[] = [];

  for (let pageNo = 1; pageNo <= MAX_PAGES; pageNo++) {
    const res = await fetchFn(buildAlioListUrl({ serviceKey, pageNo, numOfRows: pageSize }));
    if (!res.ok) throw new Error(`alio http ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const { postings, totalCount } = parseAlioListResponse(await res.json());
    all.push(...postings);
    if (postings.length === 0 || pageNo * pageSize >= totalCount) break;
  }

  const result = await ingestPostings(db, all, now);
  return { fetched: all.length, ...result };
}
