"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function LoginButton() {
  return (
    <button
      onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/postings" })}
      className="rounded-lg bg-foreground px-5 py-3 font-medium text-background hover:opacity-90"
    >
      Google로 시작하기
    </button>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
      }}
      className="text-sm text-neutral-500 hover:text-foreground"
    >
      로그아웃
    </button>
  );
}
