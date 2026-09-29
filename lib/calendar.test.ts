import { describe, expect, it } from "vitest";
import { currentMonth, gridRange, kstDateKey, monthGrid, parseMonth, shiftMonth } from "./calendar";

describe("kstDateKey", () => {
  it("uses the KST calendar date", () => {
    expect(kstDateKey(new Date("2026-10-09T15:30:00Z"))).toBe("2026-10-10");
    expect(kstDateKey(new Date("2026-10-10T14:59:59Z"))).toBe("2026-10-10");
  });
});

describe("currentMonth", () => {
  it("is the KST month", () => {
    expect(currentMonth(new Date("2026-09-30T16:00:00Z"))).toBe("2026-10");
  });
});

describe("parseMonth", () => {
  it("accepts YYYY-MM and falls back otherwise", () => {
    expect(parseMonth("2026-11", "2026-10")).toBe("2026-11");
    expect(parseMonth("2026-13", "2026-10")).toBe("2026-10");
    expect(parseMonth(undefined, "2026-10")).toBe("2026-10");
  });
});

describe("shiftMonth", () => {
  it("moves across year boundaries", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});

describe("monthGrid", () => {
  it("lays out full Sunday-first weeks around the month", () => {
    const weeks = monthGrid("2026-10"); // 2026-10-01 is a Thursday

    expect(weeks).toHaveLength(5);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0][0]).toEqual({ key: "2026-09-27", day: 27, inMonth: false });
    expect(weeks[0][4]).toEqual({ key: "2026-10-01", day: 1, inMonth: true });
    expect(weeks[4][6]).toEqual({ key: "2026-10-31", day: 31, inMonth: true });
  });

  it("adds a sixth week when the month needs it", () => {
    expect(monthGrid("2026-08")).toHaveLength(6); // starts Saturday, 31 days
  });
});

describe("gridRange", () => {
  it("spans every visible cell, including days from neighbouring months", () => {
    expect(gridRange("2026-09")).toEqual({
      from: new Date("2026-08-30T00:00:00+09:00"),
      to: new Date("2026-10-04T00:00:00+09:00"),
    });
  });
});
