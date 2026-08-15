import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { sweepExpiredReservations } from "@/lib/expire";
import { rateLimit, getClientIp } from "@/lib/ratelimit";

/** 이 응답을 클라우드플레어가 30초 동안 대신 돌려준다 — 같은 질문이 몰려도 서버는 한 번만 깬다.
 *  마감 판정의 최종 책임은 서버(uq_res_slot)에 있으므로 30초 정도 낡아도 이중예약이 되지 않는다.
 *  화면 쪽 재확인 주기(60초)보다 짧게 잡아 손님이 낡은 화면을 오래 보지 않게 한다. */
const CACHE = { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" };

// 특정 테마·날짜의 닫힌(예약불가) 시간 조회 — 예약 화면에서 사용
export async function GET(req: NextRequest) {
  /* 🔴 2026-08-14~15 — 여기에 **보호장치가 없어서** 요청 한도를 넘겼다.
     실측: 한 IP 가 1분에 이 주소를 **120번** 호출(테마 4개 × 날짜 30일 = 120, 즉 달력 전체를
     긁어가는 프로그램). 그 1분 동안 전체 요청의 89% 를 이것이 차지했다.
     손님이 예약 화면을 정상적으로 쓰면 1분에 몇 번을 넘지 않는다 → 60회로 넉넉히 잡아 막는다.
     ⚠️ 다른 공개 주소(예약 접수·조회·후기)는 원래 제한이 있었는데 여기만 빠져 있었다. */
  if (!rateLimit(`slots:${getClientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: "요청이 너무 잦습니다." }, { status: 429 });
  }

  const db = getSupabase();
  if (!db) return NextResponse.json({ blocked: [], dayClosed: false });

  // 만료 예약(30분 미입금) 자동 정리 — 실패해도 조회는 진행
  await sweepExpiredReservations(db).catch(() => {});

  // 전체 미리불러오기 모드(?all=1) — 예약 화면이 열릴 때 앞으로의 모든 날짜·테마의
  // 차단/예약 시간을 한 번에 받아, 손님이 테마·날짜를 고를 때마다 다시 물어보지 않게 한다.
  if (req.nextUrl.searchParams.get("all")) {
    // 어제(KST)부터 — 오늘 지난 시간대는 화면이 알아서 걸러내므로 넉넉히 포함해도 무방.
    const from = new Date(Date.now() + 9 * 3600 * 1000 - 86400000).toISOString().slice(0, 10);
    const [{ data: bs }, { data: rv }] = await Promise.all([
      db.from("blocked_slots").select("theme_id, date, time").gte("date", from),
      db.from("reservations").select("theme_id, date, time").gte("date", from).neq("status", "cancelled"),
    ]);
    return NextResponse.json({ all: true, blockedSlots: bs || [], reservations: rv || [] }, { headers: CACHE });
  }

  const theme = req.nextUrl.searchParams.get("theme") || "";
  const date = req.nextUrl.searchParams.get("date") || "";
  if (!date) return NextResponse.json({ blocked: [], dayClosed: false });

  // 그 날짜의 차단 슬롯 (테마 일치 또는 테마 무관 전체 차단)
  const { data } = await db
    .from("blocked_slots")
    .select("theme_id, time")
    .eq("date", date);

  const rows = (data || []).filter((b: { theme_id: string | null }) => !b.theme_id || b.theme_id === theme);
  const dayClosed = rows.some((b: { time: string | null }) => !b.time);
  const blocked = rows.filter((b: { time: string | null }) => b.time).map((b: { time: string }) => b.time);

  // 이미 예약된 시간도 불가 처리
  const { data: taken } = await db
    .from("reservations")
    .select("time")
    .eq("theme_id", theme)
    .eq("date", date)
    .neq("status", "cancelled");
  const takenTimes = (taken || []).map((t: { time: string }) => t.time);

  // blocked = 손님 화면이 쓰는 "고를 수 없는 시간" 전부(마감 + 예약참).
  // taken 은 그중 **예약이 차서** 막힌 것만 따로 준다 — 관리자 화면이
  // "마감"과 "예약있음"을 구분해 보여줘야 하기 때문이다(2026-07-31).
  return NextResponse.json({
    dayClosed,
    blocked: Array.from(new Set([...blocked, ...takenTimes])),
    taken: Array.from(new Set(takenTimes)),
  }, { headers: CACHE });
}
