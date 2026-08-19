import { NextRequest, NextResponse } from "next/server";

/* www 로 들어온 손님을 대표 주소로 넘긴다 (도메인 이전 준비 · 2026-08-12)
 *
 * www.fantastrick.co.kr 과 fantastrick.co.kr 둘 다 새 홈페이지에 연결돼 있다.
 * 둘을 그냥 두면 같은 내용이 두 주소로 존재해서, 검색엔진이 어느 쪽이 진짜인지
 * 헷갈리고 점수가 갈린다. → www 는 301(영구이동)로 대표 주소에 합쳐준다.
 *
 * ⚠️ www 인 경우에만 동작한다. 임시 주소(workers.dev)나 지금 접속에는 아무 영향 없다.
 */
/* 옛 워드프레스를 노리고 두드리는 자동 프로그램들이 찾는 주소.
   우리 사이트엔 이런 게 없는데, 옛 사이트가 워드프레스였던 걸 알고 계속 두드린다.
   next.config 의 redirects 는 그때마다 페이지를 만들어 돌려주므로 서버가 깨어난다.
   여기서 **아주 짧은 404 한 줄**로 즉시 끊어 서버 일감을 줄인다(2026-08-15). */
const WP_PROBE = /^\/(wp-admin|wp-login|wp-content|wp-includes|wp-json|xmlrpc\.php|wordpress)/i;

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";

  /* 끝에 슬래시가 붙은 `/booking/` 을 **튕기지 않고** 그대로 처리한다.
     Next 는 기본으로 `/booking/` → `/booking` 으로 한 번 돌려보내는데(308),
     빠방 수집기가 등록해둔 주소가 하필 슬래시가 붙은 쪽이다. 돌려보내면 따라오지 않을 수 있어
     아예 안 튕기게 **속으로만 바꿔서**(rewrite) 답한다 — 밖에서 보면 한 번에 끝난다. */
  if (req.nextUrl.pathname === "/booking/") {
    const to = req.nextUrl.clone();
    to.pathname = "/booking";
    return NextResponse.rewrite(to);
  }

  /* 딱 하나 예외: /wp-admin/admin-ajax.php 는 **우리가 되살린 진짜 창구**다.
     예약 모아보기 앱(빠방)의 우리 몫 수집 코드가 이 주소만 볼 줄 알아서, 옛 플러그인
     모양으로 예약 현황을 답해준다. 자세한 사정은 src/lib/booked-compat.ts 맨 위 참고.
     ⚠️ 방화벽(WAF) 규칙에서도 이 주소만 빼야 한다 — 안 빼면 여기까지 오지도 못한다. */
  if (req.nextUrl.pathname === "/wp-admin/admin-ajax.php") return NextResponse.next();

  if (WP_PROBE.test(req.nextUrl.pathname)) {
    return new NextResponse("Not Found", { status: 404, headers: { "Cache-Control": "public, max-age=86400" } });
  }
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
