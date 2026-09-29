import { describe, expect, it } from "vitest";
import { buildCalendar, type CalendarPosting } from "./ics";

const posting: CalendarPosting = {
  id: "p1",
  company: "한국전력공사",
  title: "신입사원 채용",
  url: "https://example.com/1",
  deadlineAt: new Date("2026-10-10T23:59:59+09:00"),
  deadlineTimeKnown: false,
};
const now = new Date("2026-09-29T00:00:00Z");

const unfold = (ics: string) => ics.replace(/\r\n /g, "");

describe("buildCalendar", () => {
  it("wraps events in a VCALENDAR with CRLF line endings", () => {
    const ics = buildCalendar([posting], now);

    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("creates an all-day event on the KST deadline date when the time is unknown", () => {
    const ics = unfold(buildCalendar([posting], now));

    expect(ics).toContain("UID:p1@job-radar\r\n");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261010\r\n");
    expect(ics).toContain("DTEND;VALUE=DATE:20261011\r\n");
    expect(ics).toContain("SUMMARY:[마감] 한국전력공사 · 신입사원 채용\r\n");
    expect(ics).toContain("URL:https://example.com/1\r\n");
  });

  it("creates a timed event ending at the deadline when the time is known", () => {
    const ics = unfold(
      buildCalendar([{ ...posting, deadlineAt: new Date("2026-10-10T18:00:00+09:00"), deadlineTimeKnown: true }], now),
    );

    expect(ics).toContain("DTSTART:20261010T080000Z\r\n");
    expect(ics).toContain("DTEND:20261010T090000Z\r\n");
  });

  it("escapes commas, semicolons and backslashes in text", () => {
    const ics = unfold(buildCalendar([{ ...posting, title: "a,b;c\\d" }], now));

    expect(ics).toContain("SUMMARY:[마감] 한국전력공사 · a\\,b\\;c\\\\d\r\n");
  });

  it("folds lines longer than 75 bytes without splitting multibyte characters", () => {
    const ics = buildCalendar([{ ...posting, title: "가".repeat(60) }], now);

    for (const line of ics.split("\r\n")) {
      expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
    }
    expect(unfold(ics)).toContain("가".repeat(60));
  });
});
