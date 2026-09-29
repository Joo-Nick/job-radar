export type ReminderKind = "D-3" | "D-1" | "D-0";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const OFFSETS: [ReminderKind, number][] = [
  ["D-3", 3],
  ["D-1", 1],
  ["D-0", 0],
];

/** 마감일(KST 날짜) 기준 n일 전 오전 9시 KST에 보낼 알림 목록. 이미 지났거나 마감 이후인 건 제외 */
export function planDeadlineReminders(deadlineAt: Date, now: Date): { kind: ReminderKind; sendAt: Date }[] {
  const kstMidnight = Math.floor((deadlineAt.getTime() + KST_OFFSET_MS) / DAY_MS) * DAY_MS - KST_OFFSET_MS;

  return OFFSETS.map(([kind, days]) => ({
    kind,
    sendAt: new Date(kstMidnight - days * DAY_MS + 9 * 60 * 60 * 1000),
  })).filter(({ sendAt }) => sendAt > now && sendAt < deadlineAt);
}
