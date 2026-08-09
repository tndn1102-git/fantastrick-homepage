import { NextRequest, NextResponse } from "next/server";
import { getSupabase, DB_NOT_CONFIGURED } from "@/lib/supabase";
import { normalizePhone, isValidPhone, sanitizeText, formatPhone } from "@/lib/util";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { notifyOwner } from "@/lib/sms";

/* 비즈니스(B2B) 도입 문의 접수 — /business 페이지의 폼이 여기로 보낸다.
   손님 예약과 달리 "아직 손님이 아닌 사람"이 남기는 것이라 예약 표와 섞지 않고
   biz_inquiries 에 따로 쌓는다(관리자 › 문의 탭에서 본다). */
export async function POST(req: NextRequest) {
  // 같은 사람이 실수로 두 번 누르는 건 막고, 장난 폭주는 걸러낸다. IP당 3회/분.
  if (!rateLimit(`biz-inquiry:${getClientIp(req)}`, 3, 60_000)) {
    return NextResponse.json({ error: "요청이 너무 잦습니다. 잠시 후 다시 보내주세요." }, { status: 429 });
  }

  const db = getSupabase();
  if (!db) return NextResponse.json(DB_NOT_CONFIGURED, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 }); }

  const storeName = sanitizeText(String(body.storeName || "")).slice(0, 60);
  const phone = normalizePhone(String(body.phone || ""));
  const area = sanitizeText(String(body.area || "")).slice(0, 40) || null;
  // 방 개수는 "3개", "세 칸" 처럼 들어올 수 있다. 숫자만 뽑고, 없으면 비워둔다(막지 않는다).
  const roomsRaw = String(body.rooms || "").replace(/[^0-9]/g, "");
  const rooms = roomsRaw ? Math.min(99, Number(roomsRaw)) : null;

  if (!storeName) return NextResponse.json({ error: "매장명을 입력해 주세요." }, { status: 400 });
  if (!isValidPhone(phone)) return NextResponse.json({ error: "연락처 형식을 확인해 주세요." }, { status: 400 });

  // 같은 번호가 방금 남긴 문의가 있으면 새로 만들지 않는다(더블클릭·새로고침 대비).
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data: dup } = await db
    .from("biz_inquiries")
    .select("id")
    .eq("phone", phone)
    .gte("created_at", since)
    .maybeSingle();
  if (dup) return NextResponse.json({ ok: true, duplicated: true });

  // 어떤 걸 문의하는지(통째로 시공 / 제어기 / 운영 프로그램 / 협업). 사장님이 전화하기 전에
  // 무슨 이야기를 할지 알고 걸 수 있어야 한다.
  const kind = sanitizeText(String(body.kind || "")).slice(0, 30) || null;

  const row = { store_name: storeName, phone, rooms, area, status: "new" };
  let { error } = await db.from("biz_inquiries").insert({ ...row, kind });
  // kind 칸을 아직 안 만든 상태(PGRST204)면 그것만 빼고 다시 넣는다.
  // 문의는 무슨 일이 있어도 받아야 한다 — 칸 하나 때문에 손님을 돌려보내지 않는다.
  if (error && (error.code === "PGRST204" || /kind/.test(error.message || ""))) {
    console.error("[B2B 문의] kind 칸이 없어 빼고 저장함 — migration_biz_inquiry_kind_APPLY_ME.sql 적용 필요");
    ({ error } = await db.from("biz_inquiries").insert(row));
  }
  if (error) {
    // 표가 아직 없으면(SQL 미적용) 손님에게는 "메일 주세요"로 안내한다.
    // 손님 입장에선 우리 사정이 뭐든 "연락할 방법"이 보여야 한다.
    if (error.code === "PGRST205" || error.code === "42P01") {
      console.error("[B2B 문의] biz_inquiries 표가 없음 — migration_biz_inquiries_APPLY_ME.sql 적용 필요");
      return NextResponse.json(
        { error: "지금은 문의 접수가 잠시 안 됩니다. fantastrick@fantastrick.co.kr 로 보내주시면 바로 답 드립니다." },
        { status: 503 }
      );
    }
    console.error("[B2B 문의 저장 실패]", error.message);
    return NextResponse.json({ error: "문의 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
  // 저장까지 끝났으면 사장님 폰으로 알림 한 통. 관리자 화면을 열어봐야만 알 수 있으면
  // 놓친다. ⚠️ 여기서 실패해도 문의는 이미 저장됐으므로 손님에게는 성공으로 답한다.
  try {
    const line = [storeName, area, rooms ? `방 ${rooms}개` : ""].filter(Boolean).join(" / ");
    await notifyOwner(
      `[판타스트릭] 도입 문의가 들어왔습니다.\n${kind ?? "종류 미선택"}\n${line}\n${formatPhone(phone)}\n관리자 › 도입 문의에서 확인하세요.`,
      "biz"
    );
  } catch (e) {
    console.error("[B2B 문의 알림 실패]", e);
  }
  return NextResponse.json({ ok: true });
}
