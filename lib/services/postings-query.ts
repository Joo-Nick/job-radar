import { and, asc, eq, gt, gte, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/db";
import { bookmarks, postings } from "@/db/schema";
import { matchesSubscription, type SubscriptionFilter } from "@/lib/matching";

const LIMIT = 500;

async function queryPostings(db: Db, userId: string, filter: SubscriptionFilter | null, where: SQL | undefined) {
  const rows = await db
    .select({ posting: postings, bookmarkedBy: bookmarks.userId })
    .from(postings)
    .leftJoin(bookmarks, and(eq(bookmarks.postingId, postings.id), eq(bookmarks.userId, userId)))
    .where(where)
    .orderBy(sql`${postings.deadlineAt} asc nulls last`, asc(postings.firstSeenAt))
    .limit(LIMIT);

  return rows
    .map(({ posting, bookmarkedBy }) => ({ ...posting, bookmarked: bookmarkedBy !== null }))
    .filter((p) => !filter || matchesSubscription(p, filter));
}

export type PostingListItem = Awaited<ReturnType<typeof queryPostings>>[number];

export function listOpenPostings(db: Db, opts: { userId: string; filter: SubscriptionFilter | null; now: Date }) {
  return queryPostings(db, opts.userId, opts.filter, or(isNull(postings.deadlineAt), gt(postings.deadlineAt, opts.now)));
}

/** 달력용: 마감일이 [from, to) 안에 있는 공고 (이미 마감된 것 포함) */
export function listPostingsByDeadline(
  db: Db,
  opts: { userId: string; filter: SubscriptionFilter | null; from: Date; to: Date },
) {
  return queryPostings(
    db,
    opts.userId,
    opts.filter,
    and(gte(postings.deadlineAt, opts.from), lt(postings.deadlineAt, opts.to)),
  );
}
