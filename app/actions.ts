"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { getSessionUser } from "@/lib/auth";
import type { CareerType } from "@/lib/postings";
import { bookmarkPosting, removeBookmark } from "@/lib/services/bookmarks";
import { getOrCreateSettings, saveSubscription, unlinkTelegramChat } from "@/lib/services/settings";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CAREER_TYPES: CareerType[] = ["new", "experienced", "any"];

async function requireUserId(): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}

export async function toggleBookmarkAction(formData: FormData) {
  const userId = await requireUserId();
  const postingId = String(formData.get("postingId"));
  if (!UUID.test(postingId)) throw new Error("Invalid posting id");

  if (formData.get("bookmarked") === "1") await removeBookmark(getDb(), userId, postingId);
  else await bookmarkPosting(getDb(), userId, postingId, new Date());
  revalidatePath("/postings");
}

const list = (value: FormDataEntryValue | null) => String(value ?? "").split(",");

export async function saveSubscriptionAction(formData: FormData) {
  const userId = await requireUserId();
  const careerType = String(formData.get("careerType")) as CareerType;

  await saveSubscription(getDb(), userId, {
    keywords: list(formData.get("keywords")),
    companies: list(formData.get("companies")),
    regions: formData.getAll("regions").map(String),
    careerType: CAREER_TYPES.includes(careerType) ? careerType : "any",
  });
  revalidatePath("/settings");
  revalidatePath("/postings");
}

export async function unlinkTelegramAction() {
  const userId = await requireUserId();
  const { telegramChatId } = await getOrCreateSettings(getDb(), userId);
  if (telegramChatId) await unlinkTelegramChat(getDb(), telegramChatId);
  revalidatePath("/settings");
}
