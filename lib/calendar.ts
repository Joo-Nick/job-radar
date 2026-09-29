const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type GridDay = { key: string; day: number; inMonth: boolean };

/** Date → KST 날짜 "YYYY-MM-DD" */
export function kstDateKey(d: Date): string {
  return new Date(d.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export function currentMonth(now: Date): string {
  return kstDateKey(now).slice(0, 7);
}

export function parseMonth(value: string | undefined, fallback: string): string {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : fallback;
}

const split = (month: string) => month.split("-").map(Number) as [number, number];

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = split(month);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

/** 일요일 시작 주 단위 달력 (앞뒤 달 날짜 포함) */
export function monthGrid(month: string): GridDay[][] {
  const [y, m] = split(month);
  const first = Date.UTC(y, m - 1, 1);
  const start = first - new Date(first).getUTCDay() * DAY_MS;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const weekCount = Math.ceil((new Date(first).getUTCDay() + daysInMonth) / 7);

  return Array.from({ length: weekCount }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(start + (w * 7 + d) * DAY_MS);
      return {
        key: date.toISOString().slice(0, 10),
        day: date.getUTCDate(),
        inMonth: date.getUTCMonth() === m - 1,
      };
    }),
  );
}

/** 달력에 보이는 칸 전체(앞뒤 달 날짜 포함)의 KST 0시 ~ 마지막 칸 다음 날 0시 */
export function gridRange(month: string): { from: Date; to: Date } {
  const weeks = monthGrid(month);
  const first = weeks[0][0].key;
  const last = weeks[weeks.length - 1][6].key;
  return {
    from: new Date(Date.parse(first) - KST_OFFSET_MS),
    to: new Date(Date.parse(last) + DAY_MS - KST_OFFSET_MS),
  };
}
