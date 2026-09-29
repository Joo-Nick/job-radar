import { saveSubscriptionAction, unlinkTelegramAction } from "@/app/actions";
import { CopyButton } from "@/components/copy-button";
import { getDb } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { appUrl, requireEnv } from "@/lib/env";
import { getOrCreateSettings, getSubscription } from "@/lib/services/settings";

const REGIONS = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];

const input = "w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700";

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm text-neutral-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const user = (await getSessionUser())!;
  const db = getDb();
  const settings = await getOrCreateSettings(db, user.id);
  const sub = await getSubscription(db, user.id);
  const calendarUrl = `${appUrl()}/api/calendar/${settings.calendarToken}.ics`;
  const telegramUrl = `https://t.me/${requireEnv("TELEGRAM_BOT_USERNAME")}?start=${settings.telegramLinkToken}`;

  return (
    <div className="space-y-6">
      <Section title="1. 알림 조건" description="키워드가 공고 제목이나 직무 분야에 들어 있으면 알려드려요. 관심 기관은 다른 조건과 상관없이 모두 알려드려요.">
        <form action={saveSubscriptionAction} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium">키워드 (쉼표로 구분)</span>
            <input name="keywords" defaultValue={sub?.keywords.join(", ")} placeholder="전산, ICT, 정보통신" className={input} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">관심 기관 (쉼표로 구분)</span>
            <input name="companies" defaultValue={sub?.companies.join(", ")} placeholder="한국전력공사, 국민연금공단" className={input} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">경력</span>
            <select name="careerType" defaultValue={sub?.careerType ?? "any"} className={input}>
              <option value="any">상관없음</option>
              <option value="new">신입</option>
              <option value="experienced">경력</option>
            </select>
          </label>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">근무 지역 (선택 안 하면 전체)</legend>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map((r) => (
                <label key={r} className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-2.5 py-1 text-sm dark:border-neutral-700">
                  <input type="checkbox" name="regions" value={r} defaultChecked={sub?.regions.includes(r)} />
                  {r}
                </label>
              ))}
            </div>
          </fieldset>
          <button className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">저장</button>
        </form>
      </Section>

      <Section title="2. 텔레그램 알림" description="새 공고 알림과 관심 공고의 마감 알림(D-3, D-1, 당일 오전 9시)을 받아요.">
        {settings.telegramChatId ? (
          <form action={unlinkTelegramAction} className="flex items-center gap-3">
            <span className="text-sm">✅ 연결됨</span>
            <button className="text-sm text-neutral-500 underline hover:text-foreground">연결 해제</button>
          </form>
        ) : (
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
          >
            텔레그램 연결하기
          </a>
        )}
      </Section>

      <Section title="3. 캘린더 연동" description="관심 등록한 공고의 마감일이 내 캘린더에 자동으로 들어가요. 이 주소는 나만 알고 있어야 해요.">
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-md bg-neutral-100 px-3 py-2 text-xs dark:bg-neutral-900">{calendarUrl}</code>
          <CopyButton value={calendarUrl} />
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-500">
          <li>
            구글 캘린더: 설정 → 캘린더 추가 → URL로 추가 → 주소 붙여넣기
          </li>
          <li>
            애플 캘린더:{" "}
            <a href={calendarUrl.replace(/^https?:/, "webcal:")} className="underline">
              여기를 눌러 구독
            </a>
          </li>
        </ul>
      </Section>
    </div>
  );
}
