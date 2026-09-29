const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const kstDay = (d: Date) => Math.floor((d.getTime() + KST_OFFSET_MS) / DAY_MS);

export function dDayLabel(deadlineAt: Date | null, now: Date): string {
  if (!deadlineAt) return "상시";
  const days = kstDay(deadlineAt) - kstDay(now);
  return days === 0 ? "D-day" : `D-${days}`;
}
