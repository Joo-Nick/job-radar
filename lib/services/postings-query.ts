import { and, asc, eq, gt, isNull, or, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { bookmarks, postings } from "@/db/schema";
import { matchesSubscription, type SubscriptionFilter } from "@/lib/matching";

const LIMIT = 500;

export async function listOpenPostings(
  db: Db,
  opts: { userId: string; filter: SubscriptionFilter | null; now: Date },
) {
  const rows = await db
    .select({ posting: postings, bookmarkedBy: bookmarks.userId })
    .from(postings)
    .leftJoin(bookmarks, and(eq(bookmarks.postingId, postings.id), eq(bookmarks.userId, opts.userId)))
    .where(or(isNull(postings.deadlineAt), gt(postings.deadlineAt, opts.now)))
    .orderBy(sql`${postings.deadlineAt} asc nulls last`, asc(postings.firstSeenAt))
    .limit(LIMIT);

  return rows
    .map(({ posting, bookmarkedBy }) => ({ ...posting, bookmarked: bookmarkedBy !== null }))
    .filter((p) => !opts.filter || matchesSubscription(p, opts.filter));
}
