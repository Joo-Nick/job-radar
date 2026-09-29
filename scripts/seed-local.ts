/**
 * 로컬 개발용 샘플 공고 + 테스트 사용자.
 * 실행: npx tsx scripts/seed-local.ts  (dev 서버를 끈 상태에서. PGlite는 한 프로세스만 열 수 있음)
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });

import { getDb } from "@/db";
import { user } from "@/db/schema";
import { ingestPostings } from "@/lib/services/ingest";
import { saveSubscription } from "@/lib/services/settings";
import { parseAlioListResponse } from "@/lib/sources/alio";

const ymd = (daysFromNow: number) => {
  const d = new Date(Date.now() + 9 * 3600_000 + daysFromNow * 86400_000);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
};

const sample = [
  ["한국전력공사", "2026년 하반기 신입사원(ICT) 채용", "신입", "전남,서울", "정보통신", -1, 2],
  ["국민연금공단", "전산직 경력직원 채용", "경력", "전북", "정보통신", -2, 10],
  ["한국도로공사", "행정직 신입 공개채용", "신입", "경북", "경영.회계.사무", -1, 5],
  ["한국수자원공사", "ICT 분야 체험형 인턴", "신입+경력", "대전", "정보통신", 0, 0],
  ["인천국제공항공사", "정규직 공개채용", "신입", "인천", "경영.회계.사무", -3, 20],
] as const;

async function main() {
  const db = getDb();
  const now = new Date();
  const { postings } = parseAlioListResponse({
    resultCode: 200,
    totalCount: sample.length,
    result: sample.map(([instNm, title, se, rgn, ncs, open, close], i) => ({
      instNm,
      recrutPblntSn: 900000 + i,
      recrutPbancTtl: title,
      recrutSeNm: se,
      workRgnNmLst: rgn,
      ncsCdNmLst: ncs,
      pbancBgngYmd: ymd(open),
      pbancEndYmd: ymd(close),
      srcUrl: "",
    })),
  });

  await db.insert(user).values({ id: "local-user", name: "로컬 테스트", email: "local@example.test" }).onConflictDoNothing();
  await saveSubscription(db, "local-user", { keywords: ["ICT", "정보통신"], careerType: "any", regions: [], companies: [] });
  console.log(await ingestPostings(db, postings, now));
}

main().then(() => process.exit(0));
