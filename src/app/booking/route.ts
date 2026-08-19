/* 옛 예약 페이지 주소 `/booking/` — 손님과 수집기에게 **다른 것**을 준다
 *
 * [손님]  예약 화면(/reserve)으로 넘긴다. 지금까지와 똑같다.
 *         (빠방·네이버·옛 즐겨찾기에 이 주소가 박혀 있어서 계속 들어온다)
 *
 * [수집기] 옛 워드프레스 + Booked 플러그인 페이지 모양으로 답한다
 *         (달력 3개 + 앞으로 10일치 시간 목록 — src/lib/booked-compat.ts 의 bookedPageHtml).
 *
 *         ⚠️ 실측해 보니 빠방 수집기는 **이 페이지를 읽지 않는다.**
 *            하루 30번쯤 들어오는 건 사람·검색로봇이고, 수집기는 창구
 *            (/wp-admin/admin-ajax.php)만 직접 두드린다. 그래서 실제 해결은 그쪽에서 한다.
 *            이 페이지는 **혹시 나중에 그쪽이 페이지를 읽는 방식으로 바꿔도 되도록** 남겨둔 것이다.
 *
 * [손님인지 수집기인지 어떻게 아나]
 *   브라우저는 `Accept: text/html…` 을 보낸다. 수집기는 아무거나 받겠다는 표시였다(실측).
 *   → text/html 을 원하면 사람으로 보고 예약 화면으로 넘긴다. 애매하면 **사람 쪽**으로 친다.
 *   ⚠️ 속임수가 아니다. 양쪽 다 **같은 진짜 예약 현황**이고, 모양만 다르다.
 *
 * 왜 이런 걸 하는지는 src/lib/booked-compat.ts 맨 위 설명 참고 (2026-08-19).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { bookedPageHtml } from "@/lib/booked-compat";

const AJAX = "https://fantastrick.co.kr/wp-admin/admin-ajax.php";

export async function GET(req: NextRequest) {
  const accept = req.headers.get("accept") || "";
  const wantsHtml = accept.includes("text/html") || accept === "";
  const db = getSupabase();
  if (wantsHtml || !db) {
    // 사람 — 지금까지와 똑같이 예약 화면으로
    return NextResponse.redirect(new URL("/reserve", req.url), 308);
  }
  return new NextResponse(await bookedPageHtml(db, AJAX), {
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
