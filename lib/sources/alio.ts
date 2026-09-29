import { kstDate, splitList, type CareerType, type PostingInput } from "@/lib/postings";

// 재정경제부_공공기관 채용정보 조회서비스 (data.go.kr/data/15125273)
const LIST_URL = "https://apis.data.go.kr/1051000/recruitment/list";

type AlioItem = {
  instNm: string;
  recrutPblntSn: number | string;
  recrutPbancTtl: string;
  recrutSeNm?: string;
  workRgnNmLst?: string;
  ncsCdNmLst?: string;
  pbancBgngYmd?: string;
  pbancEndYmd?: string;
  srcUrl?: string;
};

export function buildAlioListUrl(opts: { serviceKey: string; pageNo: number; numOfRows: number }): string {
  const url = new URL(LIST_URL);
  url.searchParams.set("serviceKey", opts.serviceKey);
  url.searchParams.set("pageNo", String(opts.pageNo));
  url.searchParams.set("numOfRows", String(opts.numOfRows));
  url.searchParams.set("ongoingYn", "Y");
  url.searchParams.set("resultType", "json");
  return url.toString();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseAlioListResponse(json: any): { postings: PostingInput[]; totalCount: number } {
  const gatewayError = json?.OpenAPI_ServiceResponse?.cmmMsgHeader?.errMsg;
  if (gatewayError) throw new Error(`alio gateway error: ${gatewayError}`);
  if (Number(json?.resultCode) !== 200) throw new Error(`alio error ${json?.resultCode}: ${json?.resultMsg}`);

  // 명세상 result[]의 원소가 { item: {...} } 형태로 적혀 있어 두 형태 모두 받는다
  const items: AlioItem[] = (json.result ?? []).map((r: { item?: AlioItem } & AlioItem) => r.item ?? r);
  return { postings: items.map(toPosting), totalCount: Number(json.totalCount ?? 0) };
}

function toPosting(item: AlioItem): PostingInput {
  const sourceId = String(item.recrutPblntSn);
  return {
    source: "alio",
    sourceId,
    company: item.instNm.trim(),
    title: item.recrutPbancTtl.trim(),
    careerType: careerType(item.recrutSeNm),
    regions: splitList(item.workRgnNmLst),
    jobCategories: splitList(item.ncsCdNmLst),
    openedAt: kstDate(item.pbancBgngYmd ?? "", "00:00:00"),
    deadlineAt: kstDate(item.pbancEndYmd ?? "", "23:59:59"),
    deadlineTimeKnown: false,
    url: item.srcUrl?.trim() || `https://job.alio.go.kr/recruitview.do?idx=${sourceId}`,
  };
}

function careerType(name: string | undefined): CareerType {
  if (name === "신입") return "new";
  if (name === "경력") return "experienced";
  return "any";
}
