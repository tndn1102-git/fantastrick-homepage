import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { gabiaCheck } from "@/lib/sms-gabia";

/* 가비아 연결 시험 — **문자는 한 통도 나가지 않는다.**
 *
 * 알아내려는 것 하나: 가비아가 "발송 서버 IP 등록"으로 우리를 막느냐.
 * Cloudflare 는 나가는 IP 가 매번 바뀌어서, 막힌다면 고정 IP 중계소를 세워야 한다.
 * 토큰 발급 + 잔여건수 조회까지만 해보면 발송 없이 그 답이 나온다.
 *
 * 관리자만 부를 수 있게 잠근다 — 열쇠 상태가 밖으로 보이면 안 된다. */
export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const r = await gabiaCheck();
  return NextResponse.json(r, { status: r.ok ? 200 : 502 });
}
