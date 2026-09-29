import Link from "next/link";
import { kstDateKey, monthGrid, shiftMonth } from "@/lib/calendar";
import type { PostingListItem } from "@/lib/services/postings-query";
import { PostingItem } from "./posting-item";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_CHIPS = 2;

type Props = {
  month: string;
  selectedDate: string | null;
  postings: PostingListItem[];
  now: Date;
  href: (params: Record<string, string | null>) => string;
};

export function PostingCalendar({ month, selectedDate, postings, now, href }: Props) {
  const byDate = new Map<string, PostingListItem[]>();
  for (const p of postings) {
    const key = kstDateKey(p.deadlineAt!);
    byDate.set(key, [...(byDate.get(key) ?? []), p]);
  }
  const today = kstDateKey(now);
  const [year, mon] = month.split("-").map(Number);
  const selected = selectedDate ? (byDate.get(selectedDate) ?? []) : [];

  const navButton = "rounded-md px-2.5 py-1 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Link href={href({ month: shiftMonth(month, -1), date: null })} className={navButton} aria-label="이전 달">
            ‹
          </Link>
          <h2 className="min-w-28 text-center font-semibold">
            {year}년 {mon}월
          </h2>
          <Link href={href({ month: shiftMonth(month, 1), date: null })} className={navButton} aria-label="다음 달">
            ›
          </Link>
        </div>
        <Link href={href({ month: today.slice(0, 7), date: today })} className={`${navButton} border border-neutral-300 dark:border-neutral-700`}>
          오늘
        </Link>
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-neutral-200 text-sm dark:border-neutral-800">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`border-b border-neutral-200 py-1.5 text-center text-xs font-medium dark:border-neutral-800 ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-neutral-500"}`}
          >
            {w}
          </div>
        ))}
        {monthGrid(month).flat().map((d, i) => {
          const items = byDate.get(d.key) ?? [];
          const isSelected = d.key === selectedDate;
          const weekday = i % 7;
          return (
            <Link
              key={d.key}
              href={href({ date: d.key })}
              scroll={false}
              className={`flex min-h-16 flex-col gap-1 border-b border-r border-neutral-200 p-1 dark:border-neutral-800 sm:min-h-24 ${weekday === 6 ? "border-r-0" : ""} ${d.inMonth ? "" : "bg-neutral-50 text-neutral-400 dark:bg-neutral-950"} ${isSelected ? "bg-sky-50 dark:bg-sky-950/40" : "hover:bg-neutral-50 dark:hover:bg-neutral-900"}`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${d.key === today ? "bg-foreground font-semibold text-background" : weekday === 0 ? "text-red-500" : weekday === 6 ? "text-blue-500" : ""}`}
              >
                {d.day}
              </span>
              {items.length > 0 && (
                <>
                  {/* 모바일: 건수만 */}
                  <span
                    className={`rounded px-1 text-center text-[11px] font-medium sm:hidden ${items.some((p) => p.bookmarked) ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200" : "bg-neutral-200 dark:bg-neutral-800"}`}
                  >
                    {items.length}
                  </span>
                  {/* 데스크톱: 기관명 칩 */}
                  <div className="hidden flex-col gap-0.5 sm:flex">
                    {items.slice(0, MAX_CHIPS).map((p) => (
                      <span
                        key={p.id}
                        title={`${p.company} · ${p.title}`}
                        className={`truncate rounded px-1 text-[11px] ${p.bookmarked ? "bg-amber-100 font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200" : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"}`}
                      >
                        {p.bookmarked && "★ "}
                        {p.company}
                      </span>
                    ))}
                    {items.length > MAX_CHIPS && (
                      <span className="px-1 text-[11px] text-neutral-500">+{items.length - MAX_CHIPS}건</span>
                    )}
                  </div>
                </>
              )}
            </Link>
          );
        })}
      </div>

      <section>
        {selectedDate ? (
          <>
            <h3 className="text-sm font-semibold">
              {Number(selectedDate.slice(5, 7))}월 {Number(selectedDate.slice(8))}일 마감 · {selected.length}건
            </h3>
            {selected.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-500">이날 마감하는 공고가 없어요.</p>
            ) : (
              <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {selected.map((p) => (
                  <PostingItem key={p.id} posting={p} now={now} />
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="py-4 text-center text-sm text-neutral-500">날짜를 누르면 그날 마감하는 공고를 볼 수 있어요.</p>
        )}
      </section>
    </div>
  );
}
