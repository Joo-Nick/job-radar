import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth-buttons";
import { getSessionUser } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  if (!(await getSessionUser())) redirect("/");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 sm:px-6">
      <header className="flex items-center justify-between border-b border-neutral-200 py-4 dark:border-neutral-800">
        <Link href="/postings" className="font-bold">
          채용 레이더
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/postings" className="hover:underline">
            공고
          </Link>
          <Link href="/settings" className="hover:underline">
            알림 설정
          </Link>
          <LogoutButton />
        </nav>
      </header>
      <main className="flex-1 py-6">{children}</main>
    </div>
  );
}
