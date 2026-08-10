import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { gabiaCheck } from "@/lib/sms-gabia";
import { sendTestSms } from "@/lib/sms";
import { normalizePhone, isValidPhone } from "@/lib/util";

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

/* 시험 문자 한 통 — **진짜로 나간다(1건 차감).**
 *
 * GET 은 "길이 열렸나"까지만 본다. 그런데 길이 열린 것과 손님 폰에 실제로 뜨는 것은 다른 문제라
 * (발신번호 승인, 통신사 필터, 문구 길이…), 마지막 한 칸은 실제로 보내봐야 안다.
 *
 * ⚠️ 문구는 여기 고정이다. 밖에서 내용을 정하게 두면 이 창구가 "아무 문자나 보내는 창구"가 된다.
 *    받는 번호만 받는다. 관리자 또는 CRON_SECRET 이 있어야 부를 수 있다.
 * ⚠️ sendSms 를 쓰지 않고 발송기를 직접 부른다 — 확정문자만 나가게 막아둔 게이트를
 *    시험 때문에 열면 안 되기 때문이다. 기록은 남긴다. */
const TEST_BODY = "[판타스트릭] 새 홈페이지 문자 시험입니다. 이 문자가 보이면 정상입니다.";

export async function POST(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { phone?: string };
  const phone = normalizePhone(String(body.phone ?? ""));
  if (!isValidPhone(phone)) return NextResponse.json({ error: "받는 번호를 확인해 주세요." }, { status: 400 });

  // 지금 켜져 있는 업체로 보낸다 — 어느 쪽으로 나갔는지 응답에 적어준다.
  const r = await sendTestSms(phone, TEST_BODY);
  return NextResponse.json({ ok: r.ok, vendor: r.vendor, sent: r.ok ? TEST_BODY : undefined, error: r.error });
}
