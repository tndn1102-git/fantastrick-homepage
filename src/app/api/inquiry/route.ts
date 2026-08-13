import { NextRequest, NextResponse } from "next/server";
import { getSupabase, DB_NOT_CONFIGURED } from "@/lib/supabase";
import { normalizePhone, isValidPhone, sanitizeText, formatPhone } from "@/lib/util";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { notifyOwner } from "@/lib/sms";

/* 손님 1:1 문의 접수 — 오른쪽 아래 챗봇의 [1:1 문의 남기기] 폼이 여기로 보낸다.
 *
 * [왜 홈페이지 안에 받나 — 2026-08-13 사장님 지시]
 *   전에는 카카오톡·문자 버튼으로 밖으로 내보냈다. 그러면 사장님이 카톡·문자·전화를
 *   돌아다니며 확인해야 하고, **답을 했는지 안 했는지가 아무 데도 안 남는다.**
 *   여기 쌓으면 관리자 › 문의 탭 한 곳에서 확인·답변·기록이 전부 된다.
 *
 * [표가 아직 없을 때]
 *   SQL 을 안 돌린 순간에도 손님을 빈손으로 돌려보내지 않는다 — 전화번호를 안내한다.
 */

const NO_TABLE_MSG =
  "지금은 문의 접수가 잠시 안 됩니다. 1호점 010-4547-0481 로 연락 주시면 바로 도와드립니다.";

export async function POST(req: NextRequest) {
  // 같은 사람이 실수로 두 번 누르는 건 막고, 장난 폭주는 걸러낸다. IP당 3회/분.
  if (!rateLimit(`inquiry:${getClientIp(req)}`, 3, 60_000)) {
    return NextResponse.json({ error: "요청이 너무 잦습니다. 잠시 후 다시 보내주세요." }, { status: 429 });
  }

  const db = getSupabase();
  if (!db) return NextResponse.json(DB_NOT_CONFIGURED, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 }); }

  const name = sanitizeText(String(body.name || "")).slice(0, 30);
  const phone = normalizePhone(String(body.phone || ""));
  const message = sanitizeText(String(body.message || "")).slice(0, 1000);

  if (!name) return NextResponse.json({ error: "이름을 입력해 주세요." }, { status: 400 });
  if (!isValidPhone(phone)) return NextResponse.json({ error: "연락처 형식을 확인해 주세요." }, { status: 400 });
  if (message.length < 5) return NextResponse.json({ error: "문의 내용을 조금만 더 적어주세요." }, { status: 400 });

  // 같은 번호가 방금 남긴 문의가 있으면 새로 만들지 않는다(더블클릭·새로고침 대비).
  const since = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data: dup } = await db
    .from("customer_inquiries")
    .select("id")
    .eq("phone", phone)
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();
  if (dup) return NextResponse.json({ ok: true, duplicated: true });

  const { error } = await db.from("customer_inquiries").insert({ name, phone, message, status: "new" });
  if (error) {
    // 표가 아직 없으면(SQL 미적용) 손님에게는 전화번호를 안내한다.
    // 손님 입장에선 우리 사정이 뭐든 "연락할 방법"이 보여야 한다.
    if (error.code === "PGRST205" || error.code === "42P01") {
      console.error("[1:1 문의] customer_inquiries 표가 없음 — migration_customer_inquiries_APPLY_ME.sql 적용 필요");
      return NextResponse.json({ error: NO_TABLE_MSG }, { status: 503 });
    }
    console.error("[1:1 문의 저장 실패]", error.message);
    return NextResponse.json({ error: "문의 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }

  // 저장까지 끝났으면 사장님 폰으로 알림 한 통. 관리자 화면을 열어봐야만 알 수 있으면 놓친다.
  // ⚠️ 여기서 실패해도 문의는 이미 저장됐으므로 손님에게는 성공으로 답한다.
  // 문의 **전문**을 넣는다(300자까지). 90바이트를 넘으면 sms.ts 가 알아서 LMS(장문)로 보낸다.
  //   짧게 자르면 사장님이 결국 관리자 화면을 열어봐야 해서, 알림을 받는 의미가 없다.
  //   → 폰 문자만 보고도 "지금 답해야 할 일인지" 판단되게.
  try {
    const cut = message.length > 300 ? `${message.slice(0, 300)}…(관리자에서 전문 확인)` : message;
    await notifyOwner(
      `[판타스트릭] 1:1 문의\n${name} ${formatPhone(phone)}\n\n${cut}\n\n답변 → fantastrick.co.kr/admin 문의 탭`,
      "ask",
    );
  } catch (e) {
    console.error("[1:1 문의 알림 실패]", e);
  }

  return NextResponse.json({ ok: true });
}
