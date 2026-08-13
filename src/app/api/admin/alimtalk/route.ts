import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";

/* 알림톡 도착 확인 — 관리자 › 알림톡 탭이 쓴다.
 *
 * NHN(발송 대행)에 "보낸 것들 어떻게 됐나"를 물어서 그대로 보여준다.
 * 결과 1000 = 손님 카카오톡 단말까지 **도착**했다는 뜻이다.
 *
 * ⚠️ "읽었는지(열람)"는 카카오가 어느 업체에도 알려주지 않는다.
 *    보여줄 수 있는 것의 최대치가 "도착"이다 — 화면에도 그렇게만 말한다.
 *    (읽음으로 오해하게 만들면 "읽었다며? 왜 몰라?" 같은 손님 분쟁의 근거가 된다)
 */

const HOST = "https://kakaotalk-bizmessage.api.nhncloudservice.com";

/** NHN 날짜 형식(yyyy-MM-dd HH:mm:ss) — KST 기준으로 만든다 */
function nhnDate(msAgo: number): string {
  return new Date(Date.now() + 9 * 3600 * 1000 - msAgo).toISOString().slice(0, 19).replace("T", " ");
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const appKey = process.env.NHN_ALIMTALK_APPKEY;
  const secret = process.env.NHN_ALIMTALK_SECRET;
  if (!appKey || !secret) {
    return NextResponse.json({ error: "알림톡 열쇠가 등록되지 않았습니다." }, { status: 503 });
  }

  // 기본 7일, 최대 30일까지 (NHN 조회 자체가 기간 제한이 있다)
  const days = Math.min(30, Math.max(1, Number(req.nextUrl.searchParams.get("days") || 7)));

  try {
    const qs = new URLSearchParams({
      startRequestDate: nhnDate(days * 86400_000),
      endRequestDate: nhnDate(0),
      pageNum: "1",
      pageSize: "200",
    });
    const r = await fetch(`${HOST}/alimtalk/v2.3/appkeys/${appKey}/messages?${qs}`, {
      headers: { "X-Secret-Key": secret },
    });
    const j = (await r.json()) as {
      header?: { isSuccessful?: boolean; resultMessage?: string };
      messageSearchResultResponse?: { messages?: Record<string, unknown>[] };
    };
    if (!j.header?.isSuccessful) {
      return NextResponse.json({ error: "NHN 조회 실패: " + (j.header?.resultMessage ?? "") }, { status: 502 });
    }

    const raw = j.messageSearchResultResponse?.messages ?? [];

    // 번호 → 손님 이름 (예약 표에서). 시험 발송(매장 번호)은 이름이 없어도 된다.
    const phones = [...new Set(raw.map((m) => String(m.recipientNo)))];
    const nameOf: Record<string, string> = {};
    const db = getSupabase();
    if (db && phones.length) {
      const { data } = await db
        .from("reservations")
        .select("phone, name, created_at")
        .in("phone", phones)
        .order("created_at", { ascending: true }); // 뒤에 온 것이 덮어써서 최신 이름이 남는다
      for (const row of data ?? []) nameOf[row.phone] = row.name;
    }

    const items = raw.map((m) => {
      const code = String(m.resultCode ?? "");
      const status = String(m.messageStatus ?? "");
      return {
        requestDate: String(m.requestDate ?? ""),
        receiveDate: m.receiveDate ? String(m.receiveDate) : null,
        phone: String(m.recipientNo ?? ""),
        name: nameOf[String(m.recipientNo)] ?? null,
        templateCode: String(m.templateCode ?? ""),
        content: String(m.content ?? ""),
        // 도착/실패/처리중 — 화면이 판단하지 않게 여기서 정리해 준다
        state: code === "1000" ? "delivered" : status === "COMPLETED" ? "failed" : "processing",
        detail: code === "1000" ? "카카오톡 도착" : String(m.resultCodeName ?? status),
      };
    });

    return NextResponse.json({ ok: true, days, items });
  } catch (e) {
    return NextResponse.json({ error: "조회 중 오류: " + String(e).slice(0, 120) }, { status: 502 });
  }
}
