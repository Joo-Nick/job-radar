import { toggleBookmarkAction } from "@/app/actions";
import { dDayLabel } from "@/lib/format";
import type { PostingListItem } from "@/lib/services/postings-query";
import { formatDeadline } from "@/lib/telegram";

const CAREER_LABEL = { new: "신입", experienced: "경력", any: "신입·경력" } as const;

export function PostingItem({ posting: p, now }: { posting: PostingListItem; now: Date }) {
  const closed = p.deadlineAt !== null && p.deadlineAt <= now;
  const dDay = closed ? "마감" : dDayLabel(p.deadlineAt, now);
  const urgent = dDay === "D-day" || /^D-[0-3]$/.test(dDay);

  return (
    <li className={`flex items-start gap-3 py-4 ${closed ? "opacity-50" : ""}`}>
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
}
