export type CalendarPosting = {
  id: string;
  company: string;
  title: string;
  url: string;
  deadlineAt: Date;
  deadlineTimeKnown: boolean;
};

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** KST 기준 날짜 YYYYMMDD (dayOffset일 뒤) */
function kstDateStamp(d: Date, dayOffset = 0): string {
  return new Date(d.getTime() + KST_OFFSET_MS + dayOffset * 24 * HOUR_MS).toISOString().slice(0, 10).replace(/-/g, "");
}

const escapeText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** RFC 5545: 75바이트 넘는 줄은 CRLF + 공백으로 접는다. 멀티바이트 문자는 쪼개지 않는다 */
function fold(line: string): string {
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = Buffer.byteLength(ch, "utf8");
    const limit = parts.length === 0 ? 75 : 74; // 이어지는 줄은 앞 공백 1바이트
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function event(p: CalendarPosting, now: Date): string[] {
  const time = p.deadlineTimeKnown
    ? [`DTSTART:${utcStamp(new Date(p.deadlineAt.getTime() - HOUR_MS))}`, `DTEND:${utcStamp(p.deadlineAt)}`]
    : [`DTSTART;VALUE=DATE:${kstDateStamp(p.deadlineAt)}`, `DTEND;VALUE=DATE:${kstDateStamp(p.deadlineAt, 1)}`];

  return [
    "BEGIN:VEVENT",
    `UID:${p.id}@job-radar`,
    `DTSTAMP:${utcStamp(now)}`,
    ...time,
    `SUMMARY:${escapeText(`[마감] ${p.company} · ${p.title}`)}`,
    `URL:${p.url}`,
    `DESCRIPTION:${escapeText(p.url)}`,
    "END:VEVENT",
  ];
}

export function buildCalendar(postings: CalendarPosting[], now: Date): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//job-radar//KO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:채용 마감 일정",
    "X-WR-TIMEZONE:Asia/Seoul",
    ...postings.flatMap((p) => event(p, now)),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
