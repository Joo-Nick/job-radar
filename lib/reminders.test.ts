import { describe, expect, it } from "vitest";
import { planDeadlineReminders } from "./reminders";

const deadline = new Date("2026-10-10T23:59:59+09:00");

describe("planDeadlineReminders", () => {
  it("schedules D-3, D-1 and same-day reminders at 9am KST", () => {
    const now = new Date("2026-09-30T12:00:00+09:00");

    expect(planDeadlineReminders(deadline, now)).toEqual([
      { kind: "D-3", sendAt: new Date("2026-10-07T09:00:00+09:00") },
      { kind: "D-1", sendAt: new Date("2026-10-09T09:00:00+09:00") },
      { kind: "D-0", sendAt: new Date("2026-10-10T09:00:00+09:00") },
    ]);
  });

  it("skips reminders whose send time has already passed", () => {
    const now = new Date("2026-10-09T10:00:00+09:00");

    expect(planDeadlineReminders(deadline, now).map((r) => r.kind)).toEqual(["D-0"]);
  });

  it("uses the KST calendar date even when the deadline is early morning UTC", () => {
    const earlyDeadline = new Date("2026-10-10T08:00:00+09:00"); // 2026-10-09T23:00Z
    const now = new Date("2026-09-30T12:00:00+09:00");

    expect(planDeadlineReminders(earlyDeadline, now).map((r) => r.sendAt)).toEqual([
      new Date("2026-10-07T09:00:00+09:00"),
      new Date("2026-10-09T09:00:00+09:00"),
    ]);
  });
});
