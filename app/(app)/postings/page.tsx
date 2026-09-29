import Link from "next/link";
import { toggleBookmarkAction } from "@/app/actions";
import { getDb } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { dDayLabel } from "@/lib/format";
import { listOpenPostings } from "@/lib/services/postings-query";
import { getSubscription } from "@/lib/services/settings";
import { formatDeadline } from "@/lib/telegram";

const CAREER_LABEL = { new: "신입", experienced: "경력", any: "신입·경력" } as const;

export default async function PostingsPage({ searchParams }: PageProps<"/postings">) {
  const user = (await getSessionUser())!;
  const showAll = (await searchParams).view === "all";
  const db = getDb();
  const now = new Date();
  const subscription = await getSubscription(db, user.id);
  const postings = await listOpenPostings(db, { userId: user.id, filter: showAll ? null : subscription, now });

  const tab = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm ${active ? "bg-foreground text-background" : "text-neutral-500 hover:text-foreground"}`;

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <Link href="/postings" className={tab(!showAll)}>
          내 조건
        </Link>
        <Link href="/postings?view=all" className={tab(showAll)}>
          전체
        </Link>
      </div>

      {!showAll && !subscription && (
        <p className="rounded-lg bg-neutral-100 p-4 text-sm dark:bg-neutral-900">
          아직 알림 조건이 없어요. <Link href="/settings" className="font-medium underline">알림 설정</Link>에서 관심
          키워드나 기관을 등록하세요.
        </p>
      )}

      {postings.length === 0 ? (
        <p className="py-10 text-center text-neutral-500">조건에 맞는 진행 중 공고가 없어요.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {postings.map((p) => {
            const dDay = dDayLabel(p.deadlineAt, now);
            const urgent = dDay === "D-day" || /^D-[0-3]$/.test(dDay);
            return (
              <li key={p.id} className="flex items-start gap-3 py-4">
                <form action={toggleBookmarkAction}>
                  <input type="hidden" name="postingId" value={p.id} />
                  <input type="hidden" name="bookmarked" value={p.bookmarked ? "1" : "0"} />
                  <button
                    aria-label={p.bookmarked ? "관심 해제" : "관심 등록"}
                    title={p.bookmarked ? "관심 해제" : "관심 등록 (마감 알림 + 캘린더)"}
                    className={`text-xl leading-none ${p.bookmarked ? "text-amber-400" : "text-neutral-300 hover:text-amber-300 dark:text-neutral-600"}`}
                  >
                    {p.bookmarked ? "★" : "☆"}
                  </button>
                </form>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="text-sm text-neutral-500">{p.company}</div>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="block font-medium hover:underline">
                    {p.title}
                  </a>
                  <div className="flex flex-wrap gap-x-3 text-xs text-neutral-500">
                    <span>{CAREER_LABEL[p.careerType]}</span>
                    {p.regions.length > 0 && <span>{p.regions.join(", ")}</span>}
                    {p.deadlineAt && <span>마감 {formatDeadline(p.deadlineAt, p.deadlineTimeKnown)}</span>}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${urgent ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400"}`}
                >
                  {dDay}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
