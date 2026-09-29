import { describe, expect, it } from "vitest";
import { matchesSubscription, type SubscriptionFilter } from "./matching";
import type { PostingInput } from "./postings";

const posting: PostingInput = {
  source: "alio",
  sourceId: "1",
  company: "한국전력공사",
  title: "2026년 하반기 신입사원(ICT) 채용",
  careerType: "new",
  regions: ["전남"],
  jobCategories: ["정보통신"],
  openedAt: null,
  deadlineAt: null,
  deadlineTimeKnown: false,
  url: "https://example.com",
};

const empty: SubscriptionFilter = { keywords: [], careerType: "any", regions: [], companies: [] };

describe("matchesSubscription", () => {
  it("matches a keyword found in the title", () => {
    expect(matchesSubscription(posting, { ...empty, keywords: ["ict"] })).toBe(true);
  });

  it("matches a keyword found in the job categories", () => {
    expect(matchesSubscription(posting, { ...empty, keywords: ["정보통신"] })).toBe(true);
  });

  it("rejects when no keyword is found", () => {
    expect(matchesSubscription(posting, { ...empty, keywords: ["회계"] })).toBe(false);
  });

  it("rejects an empty filter so new users are not flooded", () => {
    expect(matchesSubscription(posting, empty)).toBe(false);
  });

  it("matches a followed company regardless of other filters", () => {
    const filter = { keywords: ["회계"], careerType: "experienced" as const, regions: ["서울"], companies: ["한국전력"] };
    expect(matchesSubscription(posting, filter)).toBe(true);
  });

  it("accepts postings open to both career types for a new-grad filter", () => {
    const filter = { ...empty, keywords: ["ict"], careerType: "new" as const };
    expect(matchesSubscription({ ...posting, careerType: "any" }, filter)).toBe(true);
    expect(matchesSubscription({ ...posting, careerType: "experienced" }, filter)).toBe(false);
  });

  it("filters by region with partial names", () => {
    const filter = { ...empty, keywords: ["ict"], regions: ["서울"] };
    expect(matchesSubscription({ ...posting, regions: ["전남"] }, filter)).toBe(false);
    expect(matchesSubscription({ ...posting, regions: ["서울특별시"] }, filter)).toBe(true);
  });

  it("does not exclude postings whose region is unknown", () => {
    const filter = { ...empty, keywords: ["ict"], regions: ["서울"] };
    expect(matchesSubscription({ ...posting, regions: [] }, filter)).toBe(true);
  });
});
