import { NextResponse } from "next/server";
import { getConfig } from "@/lib/settings";

// 공개 설정 (예약 화면에서 사용): 예약금·시간대·숨김테마
//
// 🔴 2026-08-14 — **60초 동안 클라우드플레어가 대신 답하게 한다.**
//   무료 요금제는 하루 10만 요청이 한도인데, 8/13 도메인 이사 뒤 실제 손님이 다 이쪽으로
//   오면서 8/14 에 101,060 건으로 한도를 넘겼다. 이 주소는 손님이 예약 화면을 열 때마다
//   불리는데, 내용은 사장님이 설정을 바꿀 때만 달라진다 → 매번 서버를 깨울 이유가 없다.
//   60초면 사장님이 설정을 고쳐도 1분 안에 반영된다(사람이 못 느끼는 차이).
export async function GET() {
  const cfg = await getConfig();
  return NextResponse.json(cfg, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
