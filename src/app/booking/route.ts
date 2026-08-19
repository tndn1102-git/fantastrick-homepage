/* 옛 예약 페이지 주소 `/booking/` — 손님과 수집기에게 **다른 것**을 준다
 *
 * [손님]  예약 화면(/reserve)으로 넘긴다. 지금까지와 똑같다.
 *         (빠방·네이버·옛 즐겨찾기에 이 주소가 박혀 있어서 계속 들어온다)
 *
 * [수집기] 옛 워드프레스 + Booked 플러그인 페이지 모양으로 답한다.
 *         빠방의 우리 몫 수집 코드는 이 페이지를 먼저 읽어
 *           ① booked_js_vars.ajax_url (창구 주소)
 *           ② table.booked-calendar 의 data-calendar-id (달력 번호)
 *         를 뽑은 뒤 그 창구로 시간표를 물어보게 만들어져 있다.
 *         지금 우리 페이지엔 그게 없어서 **빈손으로 물어보고 있었다**
 *         (실측: 값 없는 GET 을 하루 5,884번). 그래서 그 두 가지를 다시 넣어준다.
 *         겸사겸사 **앞으로 10일치 시간표를 페이지 안에 미리 박아둔다** —
 *         상대가 창구까지 안 가고 페이지만 읽어도 자료를 얻도록.
 *
 * [손님인지 수집기인지 어떻게 아나]
 *   브라우저는 `Accept: text/html…` 을 보낸다. 수집기는 아무거나 받겠다는 표시였다(실측).
 *   → text/html 을 원하면 사람으로 보고 예약 화면으로 넘긴다. 애매하면 **사람 쪽**으로 친다.
 *   ⚠️ 이건 속임수가 아니다. 양쪽 다 **같은 진짜 예약 현황**이고, 모양만 다르다.
 *
 * 왜 이런 걸 하는지는 src/lib/booked-compat.ts 맨 위 설명 참고 (2026-08-19).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { themeById } from "@/lib/data";
import { CALENDARS, openTimesRange, apptListHtml, monthHtml, kstToday } from "@/lib/booked-compat";

const AJAX = "https://fantastrick.co.kr/wp-admin/admin-ajax.php";
const DAYS_AHEAD = 10;

export async function GET(req: NextRequest) {
  const accept = req.headers.get("accept") || "";
  const wantsHtml = accept.includes("text/html") || accept === "";
  if (wantsHtml) {
    // 사람 — 지금까지와 똑같이 예약 화면으로
    return NextResponse.redirect(new URL("/reserve", req.url), 308);
  }

  const db = getSupabase();
  if (!db) return NextResponse.redirect(new URL("/reserve", req.url), 308);

  const from = kstToday();
  const to = new Date(Date.now() + 9 * 3600 * 1000 + DAYS_AHEAD * 86400000).toISOString().slice(0, 10);
  const [Y, M] = from.split("-").map(Number);
  const mm = String(M).padStart(2, "0");
  const monthEnd = `${Y}-${mm}-${new Date(Date.UTC(Y, M, 0)).getUTCDate()}`;

  const blocks = await Promise.all(CALENDARS.map(async (c) => {
    const name = themeById(c.theme)?.name || c.theme;
    // 달력(이번 달)과 날짜별 목록(앞으로 10일)을 같은 자료로 그린다
    const month = await openTimesRange(db, c.theme, `${Y}-${mm}-01`, monthEnd > to ? monthEnd : to);
    const cal = monthHtml(c.id, `${Y}-${mm}-01`, month);
    const lists = Object.keys(month).filter((d) => d >= from && d <= to)
      .map((d) => apptListHtml(d, month[d], name)).join("\n");
    return `<div class="booked-calendar-shortcode-wrap" data-calendar-id="${c.id}" data-theme="${c.theme}">
<h3 class="booked-calendar-title">${name}</h3>
${cal}
${lists}
</div>`;
  }));

  const html = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8">
<title>예약 - 판타스트릭</title>
<script type="text/javascript">
/* 옛 플러그인이 심어두던 값 — 수집기가 여기서 창구 주소를 읽어간다 */
var booked_js_vars = {"ajax_url":"${AJAX}","profilePage":"https://fantastrick.co.kr/reserve","publicAppointments":"","i18n_please_wait":"\\uc7a0\\uc2dc\\ub9cc \\uae30\\ub2e4\\ub824\\uc8fc\\uc138\\uc694 ..."};
</script>
</head><body class="booked-ltr">
<div id="booked-page-form">
${blocks.join("\n")}
</div>
<!-- 예약 가능한 시간만 그려져 있습니다. 실제 예약은 https://fantastrick.co.kr/reserve -->
</body></html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
