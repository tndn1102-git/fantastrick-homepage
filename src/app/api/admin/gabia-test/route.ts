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
// 관리자 세션이거나, 내부 점검용 비밀키(CRON_SECRET)를 들고 오면 허용한다
// — 백업·동기화 크론이 쓰는 것과 같은 방식이라 새 통로를 만들지 않는다.
async function authorized(req: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") === `Bearer ${secret}`) return true;
  return isAdmin(req);
}

export async function GET(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  const r = await gabiaCheck();
  return NextResponse.json(r, { status: r.ok ? 200 : 502 });
}
