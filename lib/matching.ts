import type { CareerType, PostingInput } from "@/lib/postings";

export type SubscriptionFilter = {
  keywords: string[];
  careerType: CareerType;
  regions: string[];
  companies: string[];
};

type MatchablePosting = Pick<PostingInput, "company" | "title" | "careerType" | "regions" | "jobCategories">;

const includes = (haystack: string, needle: string) => haystack.toLowerCase().includes(needle.toLowerCase());

export function matchesSubscription(posting: MatchablePosting, filter: SubscriptionFilter): boolean {
  if (filter.companies.some((c) => includes(posting.company, c))) return true;
  if (filter.keywords.length === 0) return false;

  const keywordHit = filter.keywords.some(
    (k) => includes(posting.title, k) || posting.jobCategories.some((cat) => includes(cat, k)),
  );
  if (!keywordHit) return false;

  if (filter.careerType !== "any" && posting.careerType !== "any" && posting.careerType !== filter.careerType) {
    return false;
  }

  if (filter.regions.length > 0 && posting.regions.length > 0) {
    return posting.regions.some((r) => filter.regions.some((f) => includes(r, f) || includes(f, r)));
  }
  return true;
}
