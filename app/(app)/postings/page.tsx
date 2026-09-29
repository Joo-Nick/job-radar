import Link from "next/link";
import { PostingCalendar } from "@/components/posting-calendar";
import { PostingItem } from "@/components/posting-item";
import { getDb } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { currentMonth, gridRange, kstDateKey, parseMonth } from "@/lib/calendar";
import { listOpenPostings, listPostingsByDeadline } from "@/lib/services/postings-query";
import { getSubscription } from "@/lib/services/settings";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function PostingsPage({ searchParams }: PageProps<"/postings">) {
  const params = await searchParams;
  const user = (await getSessionUser())!;
  const db = getDb();
  const now = new Date();

  const showAll = one(params.view) === "all";
  const isCalendar = one(params.mode) === "calendar";
  const month = parseMonth(one(params.month), currentMonth(now));
  const dateParam = one(params.date);
  const today = kstDateKey(now);
  const selectedDate =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today.startsWith(month) ? today : null;

  const subscription = await getSubscription(db, user.id);
  const filter = showAll ? null : subscription;
  const postings = isCalendar
    ? await listPostingsByDeadline(db, { userId: user.id, filter, ...gridRange(month) })
    : await listOpenPostings(db, { userId: user.id, filter, now });

  const current = { view: showAll ? "all" : null, mode: isCalendar ? "calendar" : null, month: isCalendar ? month : null, date: isCalendar ? dateParam ?? null : null };
  const href = (overrides: Record<string, string | null>) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...current, ...overrides })) if (v) qs.set(k, v);
    const s = qs.toString();
    return s ? `/postings?${s}` : "/postings";
  };

  const pill = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm ${active ? "bg-foreground text-background" : "text-neutral-500 hover:text-foreground"}`;
  const segment = (active: boolean) =>
    `px-3 py-1.5 text-sm ${active ? "bg-neutral-200 font-medium dark:bg-neutral-800" : "text-neutral-500 hover:text-foreground"}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <Link href={href({ view: null })} className={pill(!showAll)}>
            내 조건
          </Link>
          <Link href={href({ view: "all" })} className={pill(showAll)}>
            전체
          </Link>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-neutral-300 dark:border-neutral-700" role="group" aria-label="보기 방식">
          <Link href={href({ mode: null, month: null, date: null })} className={segment(!isCalendar)} aria-current={!isCalendar}>
            리스트
          </Link>
          <Link href={href({ mode: "calendar" })} className={segment(isCalendar)} aria-current={isCalendar}>
            달력
          </Link>
        </div>
      </div>

      {!showAll && !subscription && (
        <p className="rounded-lg bg-neutral-100 p-4 text-sm dark:bg-neutral-900">
          아직 알림 조건이 없어요. <Link href="/settings" className="font-medium underline">알림 설정</Link>에서 관심
          키워드나 기관을 등록하세요.
        </p>
      )}

      {isCalendar ? (
        <PostingCalendar month={month} selectedDate={selectedDate} postings={postings} now={now} href={href} />
      ) : postings.length === 0 ? (
        <p className="py-10 text-center text-neutral-500">조건에 맞는 진행 중 공고가 없어요.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {postings.map((p) => (
            <PostingItem key={p.id} posting={p} now={now} />
          ))}
        </ul>
      )}
    </div>
  );
}
