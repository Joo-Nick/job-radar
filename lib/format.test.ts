import { describe, expect, it } from "vitest";
import { dDayLabel } from "./format";

const now = new Date("2026-09-29T23:30:00+09:00");

describe("dDayLabel", () => {
  it("counts KST calendar days to the deadline", () => {
    expect(dDayLabel(new Date("2026-10-02T00:10:00+09:00"), now)).toBe("D-3");
  });

  it("says D-day on the deadline date", () => {
    expect(dDayLabel(new Date("2026-09-29T23:59:59+09:00"), now)).toBe("D-day");
  });

  it("says 상시 without a deadline", () => {
    expect(dDayLabel(null, now)).toBe("상시");
  });
});
