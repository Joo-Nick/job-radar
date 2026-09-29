export type CareerType = "new" | "experienced" | "any";

export type PostingInput = {
  source: "alio";
  sourceId: string;
  company: string;
  title: string;
  careerType: CareerType;
  regions: string[];
  jobCategories: string[];
  openedAt: Date | null;
  deadlineAt: Date | null;
  /** false면 마감일만 알고 시각은 모름 (deadlineAt은 그날 23:59:59 KST) */
  deadlineTimeKnown: boolean;
  url: string;
};

/** "20261010" → 그날 KST 시각의 Date */
export function kstDate(yyyymmdd: string, time: string): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(yyyymmdd.trim());
  return m ? new Date(`${m[1]}-${m[2]}-${m[3]}T${time}+09:00`) : null;
}

export function splitList(value: string | undefined | null): string[] {
  return (value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
