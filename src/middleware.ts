import { NextRequest, NextResponse } from "next/server";

/* www 로 들어온 손님을 대표 주소로 넘긴다 (도메인 이전 준비 · 2026-08-12)
 *
 * www.fantastrick.co.kr 과 fantastrick.co.kr 둘 다 새 홈페이지에 연결돼 있다.
 * 둘을 그냥 두면 같은 내용이 두 주소로 존재해서, 검색엔진이 어느 쪽이 진짜인지
 * 헷갈리고 점수가 갈린다. → www 는 301(영구이동)로 대표 주소에 합쳐준다.
 *
 * ⚠️ www 인 경우에만 동작한다. 임시 주소(workers.dev)나 지금 접속에는 아무 영향 없다.
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  // tgc = 안 쓰기로 확정된 옛 TGC 예약 사이트 주소(2026-08-13 사장님 결정).
  // 옛 링크·즐겨찾기로 들어온 손님을 대표 주소로 데려온다.
  if (host === "www.fantastrick.co.kr" || host === "tgc.fantastrick.co.kr") {
    const url = new URL(req.url);
    url.host = "fantastrick.co.kr";
    return NextResponse.redirect(url, 301);
  }
  return NextResponse.next();
}

/* 정적 파일(그림·글꼴)까지 이 검사를 태울 필요는 없다 — 페이지·API 요청만 본다. */
export const config = {
  matcher: ["/((?!_next/|images/|fonts/|favicon).*)"],
};
