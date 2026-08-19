/* 옛 워드프레스 예약 플러그인(Booked)의 창구를 **그대로 되살린 것**
 *   POST/GET  /wp-admin/admin-ajax.php
 *
 * 왜 이게 필요한지, 규격을 어디서 얻었는지는 src/lib/booked-compat.ts 맨 위에 적어뒀다.
 * 요약: 예약 모아보기 앱(빠방)의 우리 몫 수집 코드가 이 주소만 볼 줄 안다.
 *       고쳐달라고 했지만 안 고쳐줘서, 우리가 옛 모양으로 답해준다(2026-08-19).
 *
 * ⚠️ 이 주소는 middleware 의 워드프레스 차단에서 **예외**로 빼뒀다(middleware.ts 참고).
 *    방화벽(WAF) 규칙에서도 이 주소만 빼야 한다 — `node scripts/waf-ajax.mjs allow`
 * ⚠️ 여기로 오는 요청은 하루 약 5,900건이다. 요청 한도(10만)의 6% 쯤 쓴다.
 *    그래서 답은 캐시를 붙여 같은 질문이 몰려도 서버가 자주 안 깨게 한다.
 * ⚠️ 로그인·글쓰기 같은 진짜 워드프레스 기능은 **하나도 없다.** 예약 현황 읽기 전용이다.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { themeById } from "@/lib/data";
import {
  CALENDARS, themeOfCalendar, openTimes, openTimesRange, apptListHtml, monthHtml, kstToday, bookedPageHtml,
} from "@/lib/booked-compat";

/** 30초 캐시 — /api/slots 와 같은 기준(예약 마감 판정의 책임은 서버에 있다). */
const CACHE = { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" };
const AJAX_URL = "https://fantastrick.co.kr/wp-admin/admin-ajax.php";
const HTML = { "Content-Type": "text/html; charset=UTF-8", ...CACHE };

/** GET 이든 POST(폼) 이든 같은 값을 꺼낸다 — 플러그인은 POST 였지만 둘 다 받아준다. */
async function params(req: NextRequest): Promise<URLSearchParams> {
  const q = new URLSearchParams(req.nextUrl.searchParams);
  if (req.method === "POST") {
    try {
      const body = await req.text();
      for (const [k, v] of new URLSearchParams(body)) if (!q.has(k)) q.set(k, v);
    } catch { /* 본문이 없으면 주소 쪽 값만 쓴다 */ }
  }
  return q;
}

async function handle(req: NextRequest) {
  const p = await params(req);
  const action = p.get("action") || "";
  const db = getSupabase();
  if (!db) return new NextResponse("0", { status: 200, headers: HTML });

  const theme = themeOfCalendar(p.get("calendar_id"));

  /* ── 하루치 시간 목록 ──
     플러그인에서 날짜를 눌렀을 때 오던 요청. 수집기가 실제로 원하는 건 이것이다. */
  if (action === "booked_calendar_date" || action === "booked_appointment_list_date") {
    const date = (p.get("date") || kstToday()).slice(0, 10);
    if (!theme) return new NextResponse("0", { status: 200, headers: HTML });
    const times = await openTimes(db, theme, date);
    return new NextResponse(apptListHtml(date, times, themeById(theme)?.name || ""), { headers: HTML });
  }

  /* ── 한 달 달력 ──
     날짜별로 자리가 있는지 없는지가 칸에 담긴다(data-available). */
  if (action === "booked_calendar_month") {
    const goto = (p.get("gotoMonth") || kstToday()).slice(0, 10);
    const [Y, M] = goto.split("-").map(Number);
    const calId = Number(p.get("calendar_id")) || CALENDARS[0].id;
    if (!theme) return new NextResponse("0", { status: 200, headers: HTML });
    const mm = String(M).padStart(2, "0");
    const days = new Date(Date.UTC(Y, M, 0)).getUTCDate();
    // 한 달치를 DB 질문 3번으로 끝낸다 (날짜마다 부르면 90번이 넘는다)
    const openByDate = await openTimesRange(db, theme, `${Y}-${mm}-01`, `${Y}-${mm}-${days}`);
    return new NextResponse(monthHtml(calId, `${Y}-${mm}-01`, openByDate), { headers: HTML });
  }

  /* ── 값이 없거나 모르는 요청 ──
     빠방 수집기는 **아무 값도 안 붙인 GET 만** 보낸다 — 하루 약 5,900번, 예외 없이.
     (2026-08-19 방화벽을 열고 5분 30초 지켜본 30건이 전부 그랬다. calendar_id 도 action 도 없다.)
     옛 워드프레스는 여기에 "0" 한 글자를 돌려줬으니, 그대로 흉내내면 그쪽은 **영영 아무것도
     못 가져간다.** 3일을 지켜봐도 요청 방식이 바뀔 기미가 없었다.
     → 그래서 지금 보내는 그 요청에 **답을 실어 보낸다.** 옛 예약 페이지 통째로(달력 3개 +
       앞으로 10일치 시간 목록). 무엇을 읽든 자료가 손에 잡히도록.
     ⚠️ 이 답에는 테마 3개가 같이 담긴다. 그쪽 목록에 어떻게 반영되는지 보고,
        섞여 보이면 부르는 곳(IP)별로 테마를 나눠 주는 방식으로 바꾼다. */
  return new NextResponse(await bookedPageHtml(db, AJAX_URL), { headers: HTML });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
