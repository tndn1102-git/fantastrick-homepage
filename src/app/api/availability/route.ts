/* 🔓 예약 현황 공개 API — 예약 모아보기 서비스에 제공하는 **정식 창구**
 *   GET /api/availability
 *
 * [왜 따로 만들었나]
 *   빠방 쪽에서 "API 등을 제공해주시면 더 빨리 적용 가능합니다" 라는 답을 받았다(2026-08-19).
 *   /api/slots 도 같은 값을 주지만 그건 **우리 예약 화면이 쓰는 내부 창구**라,
 *   화면을 고치면 모양이 바뀔 수 있다. 밖에 알려준 규격이 우리 사정으로 깨지면 안 되므로
 *   바깥에 공개할 주소를 따로 판다.
 *
 * [바깥과의 약속 — 반드시 지킬 것]
 *   · 칸을 **더하는 건 언제든** 괜찮다. 있던 칸을 없애거나 이름을 바꾸지 않는다.
 *   · 없애야 할 일이 생기면 /api/availability/v2 를 새로 만들고 이건 그대로 둔다.
 *   · 값의 계산은 src/lib/availability.ts 하나에서만 한다 —
 *     손님 화면엔 있는데 여기엔 없는 일이 생길 수 없다.
 *
 * [쓰는 법]
 *   GET /api/availability            앞으로 7일 · 테마 전부
 *   GET /api/availability?days=14    앞으로 14일 (1~30)
 *   GET /api/availability?theme=ldc  그 테마만
 *   설명 페이지: https://fantastrick.co.kr/reservation-api
 *
 * ⚠️ 누구나 읽게 열어둔다(CORS 허용). 담기는 건 공개된 예약 가능 시간뿐이고
 *    손님 이름·연락처는 한 글자도 나가지 않는다.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { THEMES, STORES } from "@/lib/data";
import { CALENDARS } from "@/lib/booked-compat";
import { availabilityRange, kstToday, kstDatePlus } from "@/lib/availability";
import { RESERVATION_OPEN_DAYS_AHEAD, RESERVATION_OPEN_HOUR_KST } from "@/lib/util";

const HEAD = {
  "Content-Type": "application/json; charset=utf-8",
  // 브라우저에서 바로 열어볼 수 있어야 상대 개발자가 편하다
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  // 60초 캐시 — 같은 질문이 몰려도 서버는 한 번만 깬다
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: HEAD });
}

export async function GET(req: NextRequest) {
  const db = getSupabase();
  if (!db) return NextResponse.json({ error: "일시적으로 조회할 수 없습니다." }, { status: 503, headers: HEAD });

  const q = req.nextUrl.searchParams;
  const days = Math.min(Math.max(Number(q.get("days")) || 7, 1), 30);
  const only = q.get("theme");
  const from = kstToday(), to = kstDatePlus(days - 1);

  const themes = await Promise.all(
    THEMES.filter((t) => !only || t.id === only).map(async (t) => ({
      themeId: t.id,
      name: t.name,
      branch: STORES.find((s) => s.id === t.store)?.name ?? null,
      /* 옛 워드프레스 시절 달력 번호도 알려준다 — 받는 쪽이 이미 이 번호로 방을 구분해
         두었다면 표를 다시 만들 필요 없이 그대로 이어붙일 수 있다. */
      legacyCalendarId: CALENDARS.find((c) => c.theme === t.id)?.id ?? null,
      reserveUrl: `https://fantastrick.co.kr/reserve?theme=${t.id}`,
      infoUrl: `https://fantastrick.co.kr/rooms/${t.id}`,
      days: await availabilityRange(db, t.id, from, to),
    })),
  );

  return NextResponse.json({
    store: { name: "판타스트릭", url: "https://fantastrick.co.kr", tel: "010-5536-0483" },
    // 예약창이 언제 열리는지 — 이용일 7일 전 21시(한국 시간)
    reservationOpens: { daysAhead: RESERVATION_OPEN_DAYS_AHEAD, hourKst: RESERVATION_OPEN_HOUR_KST },
    range: { from, to, days },
    generatedAt: new Date(Date.now() + 9 * 3600 * 1000).toISOString().replace("Z", "+09:00"),
    timezone: "Asia/Seoul",
    themes,
    docs: "https://fantastrick.co.kr/reservation-api",
  }, { headers: HEAD });
}
