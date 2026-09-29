import { redirect } from "next/navigation";
import { LoginButton } from "@/components/auth-buttons";
import { getSessionUser } from "@/lib/auth";

export default async function Home() {
  if (await getSessionUser()) redirect("/postings");

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">채용 레이더</h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          공고를 찾아다니지 마세요. 조건에 맞는 새 공고가 뜨면 알려드리고, 관심 공고의 마감일은 캘린더에 넣어드려요.
        </p>
      </div>
      <ul className="space-y-2 text-neutral-700 dark:text-neutral-300">
        <li>🆕 관심 직무·기관의 새 공고를 텔레그램으로 바로 알림</li>
        <li>⭐ 알림에서 버튼 한 번으로 관심 등록</li>
        <li>⏰ 마감 D-3, D-1, 당일 아침 알림</li>
        <li>📅 구글·애플 캘린더 자동 연동</li>
      </ul>
      <div>
        <LoginButton />
      </div>
      <p className="text-sm text-neutral-500">현재 공공기관 채용정보(잡알리오)를 수집하고 있어요.</p>
    </main>
  );
}
