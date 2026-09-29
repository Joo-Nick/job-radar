import { describe, expect, it } from "vitest";
import { buildAlioListUrl, parseAlioListResponse } from "./alio";

const item = {
  instNm: "한국전력공사",
  recrutPblntSn: 281234,
  recrutPbancTtl: "2026년 하반기 신입사원 채용",
  recrutSeNm: "신입",
  workRgnNmLst: "전남,서울",
  ncsCdNmLst: "정보통신,전기.전자",
  pbancBgngYmd: "20260920",
  pbancEndYmd: "20261010",
  srcUrl: "https://recruit.kepco.co.kr/notice/123",
  ongoingYn: "Y",
};

describe("parseAlioListResponse", () => {
  it("maps an alio item to a normalized posting", () => {
    const { postings } = parseAlioListResponse({ resultCode: 200, totalCount: 1, result: [item] });

    expect(postings).toEqual([
      {
        source: "alio",
        sourceId: "281234",
        company: "한국전력공사",
        title: "2026년 하반기 신입사원 채용",
        careerType: "new",
        regions: ["전남", "서울"],
        jobCategories: ["정보통신", "전기.전자"],
        openedAt: new Date("2026-09-20T00:00:00+09:00"),
        deadlineAt: new Date("2026-10-10T23:59:59+09:00"),
        deadlineTimeKnown: false,
        url: "https://recruit.kepco.co.kr/notice/123",
      },
    ]);
  });

  it("accepts items wrapped in an item property", () => {
    const { postings } = parseAlioListResponse({ resultCode: 200, totalCount: 1, result: [{ item }] });

    expect(postings[0].sourceId).toBe("281234");
  });

  it("maps career types from the recruitment category name", () => {
    const career = (recrutSeNm: string) =>
      parseAlioListResponse({ resultCode: 200, totalCount: 1, result: [{ ...item, recrutSeNm }] }).postings[0]
        .careerType;

    expect(career("경력")).toBe("experienced");
    expect(career("신입+경력")).toBe("any");
    expect(career("외국인")).toBe("any");
  });

  it("falls back to the alio detail page when the source url is empty", () => {
    const { postings } = parseAlioListResponse({ resultCode: 200, totalCount: 1, result: [{ ...item, srcUrl: "" }] });

    expect(postings[0].url).toBe("https://job.alio.go.kr/recruitview.do?idx=281234");
  });

  it("keeps postings without an end date with a null deadline", () => {
    const { postings } = parseAlioListResponse({
      resultCode: 200,
      totalCount: 1,
      result: [{ ...item, pbancEndYmd: "" }],
    });

    expect(postings[0].deadlineAt).toBeNull();
  });

  it("returns the total count for pagination", () => {
    expect(parseAlioListResponse({ resultCode: 200, totalCount: 57, result: [] }).totalCount).toBe(57);
  });

  it("throws on a non-success result code", () => {
    expect(() => parseAlioListResponse({ resultCode: 10, resultMsg: "잘못된 요청 파라미터 에러" })).toThrow(
      /잘못된 요청 파라미터 에러/,
    );
  });

  it("throws on a gateway error response", () => {
    expect(() =>
      parseAlioListResponse({
        OpenAPI_ServiceResponse: { cmmMsgHeader: { errMsg: "SERVICE_KEY_IS_NOT_REGISTERED_ERROR" } },
      }),
    ).toThrow(/SERVICE_KEY_IS_NOT_REGISTERED_ERROR/);
  });
});

describe("buildAlioListUrl", () => {
  it("requests ongoing postings as json with the given page", () => {
    const url = new URL(buildAlioListUrl({ serviceKey: "a+b/c=", pageNo: 3, numOfRows: 100 }));

    expect(url.origin + url.pathname).toBe("https://apis.data.go.kr/1051000/recruitment/list");
    expect(url.searchParams.get("serviceKey")).toBe("a+b/c=");
    expect(url.searchParams.get("pageNo")).toBe("3");
    expect(url.searchParams.get("numOfRows")).toBe("100");
    expect(url.searchParams.get("ongoingYn")).toBe("Y");
    expect(url.searchParams.get("resultType")).toBe("json");
  });
});
