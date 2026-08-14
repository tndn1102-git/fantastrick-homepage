import { NextRequest, NextResponse } from "next/server";
import { getSupabase, DB_NOT_CONFIGURED } from "@/lib/supabase";
import { maskPhone } from "@/lib/util";

type ReviewRow = { phone: string | null; [k: string]: unknown };

// 리뷰 목록 조회 (전체 또는 테마별)
export async function GET(req: NextRequest) {
  const db = getSupabase();
  if (!db) return NextResponse.json(DB_NOT_CONFIGURED, { status: 503 });

  const theme = req.nextUrl.searchParams.get("theme");
  let q = db
    .from("reviews")
    .select("id, theme_id, theme_name, name, phone, body, source, source_url, created_at")
    .eq("status", "approved") // 승인된 후기만 공개
    .order("created_at", { ascending: false })
    .limit(100);
  if (theme && theme !== "all") q = q.eq("theme_id", theme);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: "리뷰 조회 중 오류가 발생했습니다." }, { status: 500 });
  // 개인정보 노출 차단: 전화번호는 서버에서 마스킹해서 내보낸다
  const reviews = (data as ReviewRow[] | null || []).map((r) => ({
    ...r,
    phone: r.phone ? maskPhone(r.phone) : "",
  }));
  // 🔴 2026-08-14 — 5분 동안 클라우드플레어가 대신 답하게 한다(요청 한도 절약).
  //   후기는 사장님이 등록할 때만 바뀌는데, 손님이 홈을 열 때마다 불린다.
  return NextResponse.json({ ok: true, reviews }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800" },
  });
}

/* 🔴 2026-08-13 — 손님이 직접 후기를 쓰는 통로(POST)를 **닫았다**(사장님 지시).
   이 페이지의 후기는 전부 관리자가 동의를 받아 옮겨온 글이다.
   화면에서 폼만 지우면 통로는 열린 채로 남아, 주소만 알면 아무나 후기를 넣을 수 있다.
   ⚠️ 다시 열 일이 생기면 git 이력(2026-08-13 이전)에서 통째로 되살릴 것 —
      예약 이력 확인·중복 방지·1분 5회 제한이 함께 들어 있었다. */
