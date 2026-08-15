import { NextRequest, NextResponse } from "next/server";
import { getSupabase, DB_NOT_CONFIGURED } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";

/* 시간을 옮긴 예약만 모아 보기 — 관리자 › 예약 › 시간변경 탭이 쓴다.
 *
 * [왜 필요한가]
 *   "이 손님 원래 몇 시였죠?" 를 확인할 데가 예약 하나하나 열어보는 것뿐이었다.
 *   변경은 흔치 않지만 생기면 반드시 확인이 필요한 일이라(손님과 말이 엇갈리는 지점),
 *   한 화면에 모아 놓는다.
 *
 * [두 종류를 함께 보여준다]
 *   · 손님 시간변경 — 손님이 [예약 조회]에서 직접 옮긴 것 (1건당 1회만 가능)
 *   · 시간 옮김     — 사장님이 관리자 화면에서 옮긴 것
 *   이력의 action 값이 서로 달라서 그것으로 구분한다. detail 에 "이전 → 이후" 가 들어 있다.
 *
 * ⚠️ 예약이 지워지면 이력만 남는다(주인 없는 이력). 그런 줄은 목록에서 빼고 건수만 알린다 —
 *    이름도 테마도 없는 줄을 보여줘야 사장님에게 도움이 안 된다.
 */

export const dynamic = "force-dynamic";

const ACTIONS = ["손님 시간변경", "시간 옮김"];

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const db = getSupabase();
  if (!db) return NextResponse.json(DB_NOT_CONFIGURED, { status: 503 });

  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get("days") || 90)));
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const { data: logs, error } = await db
    .from("reservation_logs")
    .select("id, reservation_id, action, detail, created_at")
    .in("action", ACTIONS)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) return NextResponse.json({ error: "변경 이력을 못 읽었습니다." }, { status: 500 });

  const rows = logs || [];
  const ids = [...new Set(rows.map((l) => l.reservation_id))].filter(Boolean) as string[];

  // 예약 정보를 붙인다(누가·어느 테마·지금 상태). 없으면 지워진 예약이다.
  const info = new Map<string, Record<string, unknown>>();
  if (ids.length) {
    const { data } = await db
      .from("reservations")
      .select("id, name, phone, theme_id, theme_name, date, time, status, deposit_paid")
      .in("id", ids);
    for (const r of data || []) info.set(r.id as string, r);
  }

  let orphan = 0;
  const items = rows
    .map((l) => {
      const r = info.get(l.reservation_id as string);
      if (!r) { orphan++; return null; }
      // detail 형식: "2026-08-19 14:40 → 2026-08-19 16:00"
      const m = /^(.+?)\s*→\s*(.+)$/.exec(String(l.detail || ""));
      return {
        id: l.id,
        reservationId: l.reservation_id,
        at: l.created_at,
        by: l.action === "손님 시간변경" ? "customer" : "admin",
        from: m?.[1]?.trim() || "",
        to: m?.[2]?.trim() || String(l.detail || ""),
        name: r.name, phone: r.phone,
        themeId: r.theme_id, themeName: r.theme_name,
        nowDate: r.date, nowTime: r.time,
        status: r.status, depositPaid: r.deposit_paid,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ ok: true, days, items, orphan });
}
