import { NextRequest, NextResponse } from "next/server";
import { getSupabase, DB_NOT_CONFIGURED } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";
import { sanitizeText, normalizePhone } from "@/lib/util";

/* 매장에서 손으로 접수한 환불 — 관리자 › 입금·환불 › 환불 처리 탭이 쓴다.
 *
 * 홈페이지에서 취소된 예약은 자동으로 환불 목록에 뜨지만, 현장에서 생기는 환불
 * (현장 취소·착오 입금·중복 결제 등)은 아무 데도 안 남는다. 직원이 여기 적어두면
 * 사장님이 한 화면에서 같이 보고 처리한다. (2026-08-15 사장님 요청)
 */

const NO_TABLE =
  "매장 환불 표가 아직 없습니다. supabase/migration_manual_refunds_APPLY_ME.sql 을 Supabase SQL Editor 에서 한 번 실행해 주세요.";

/* 표가 없을 때 오는 코드 두 가지 — 둘 다 "SQL 을 아직 안 돌렸다"는 같은 뜻 */
function isMissingTable(code?: string) {
  return code === "PGRST205" || code === "42P01";
}

const COLS = "id, name, phone, amount, bank, account, holder, reason, staff, status, memo, created_at, done_at";
const STATUSES = ["pending", "done", "cancelled"];

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const db = getSupabase();
  if (!db) return NextResponse.json(DB_NOT_CONFIGURED, { status: 503 });

  const { data, error } = await db
    .from("manual_refunds")
    .select(COLS)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    if (isMissingTable(error.code)) return NextResponse.json({ error: NO_TABLE, needsMigration: true }, { status: 503 });
    return NextResponse.json({ error: "매장 환불 목록을 못 읽었습니다." }, { status: 500 });
  }
  const rows = data || [];
  return NextResponse.json({
    ok: true,
    items: rows,
    pending: rows.filter((r) => r.status === "pending").length,
  });
}

/** 현장 직원이 새로 접수 */
export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const db = getSupabase();
  if (!db) return NextResponse.json(DB_NOT_CONFIGURED, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 }); }

  const name = sanitizeText(String(body.name || "")).slice(0, 40);
  const bank = sanitizeText(String(body.bank || "")).slice(0, 30);
  const account = sanitizeText(String(body.account || "")).slice(0, 40);
  const holder = sanitizeText(String(body.holder || "")).slice(0, 40);
  const reason = sanitizeText(String(body.reason || "")).slice(0, 200);
  const staff = sanitizeText(String(body.staff || "")).slice(0, 30) || null;
  const phoneRaw = String(body.phone || "").trim();
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  // 금액은 "25,000원" 처럼 들어올 수 있다 — 숫자만 뽑는다(직원이 편한 대로 적게).
  const amount = Number(String(body.amount ?? "").replace(/[^0-9]/g, ""));

  if (!name) return NextResponse.json({ error: "손님 이름을 적어주세요." }, { status: 400 });
  if (!(amount > 0)) return NextResponse.json({ error: "환불 금액을 숫자로 적어주세요." }, { status: 400 });
  if (amount > 10_000_000) return NextResponse.json({ error: "금액이 너무 큽니다. 다시 확인해 주세요." }, { status: 400 });
  if (!bank) return NextResponse.json({ error: "은행을 적어주세요." }, { status: 400 });
  if (!account) return NextResponse.json({ error: "계좌번호를 적어주세요." }, { status: 400 });
  if (!holder) return NextResponse.json({ error: "예금주를 적어주세요." }, { status: 400 });
  if (!reason) return NextResponse.json({ error: "환불 사유를 적어주세요. 사장님이 판단할 근거가 됩니다." }, { status: 400 });

  const { error } = await db
    .from("manual_refunds")
    .insert({ name, phone, amount, bank, account, holder, reason, staff, status: "pending" });
  if (error) {
    if (isMissingTable(error.code)) return NextResponse.json({ error: NO_TABLE, needsMigration: true }, { status: 503 });
    console.error("[매장 환불 접수 실패]", error.message);
    return NextResponse.json({ error: "접수 중 오류가 발생했습니다." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** 처리 완료 / 취소 / 메모 */
export async function PATCH(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const db = getSupabase();
  if (!db) return NextResponse.json(DB_NOT_CONFIGURED, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 }); }
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "id 가 필요합니다." }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof body.status === "string") {
    if (!STATUSES.includes(body.status)) return NextResponse.json({ error: "상태 값이 올바르지 않습니다." }, { status: 400 });
    patch.status = body.status;
    // 보낸 시각은 "보냄"으로 바꿀 때만 남긴다. 되돌리면 지운다 — 남아 있으면 거짓이 된다.
    patch.done_at = body.status === "done" ? new Date().toISOString() : null;
  }
  if (typeof body.memo === "string") patch.memo = sanitizeText(body.memo).slice(0, 200) || null;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "변경할 내용이 없습니다." }, { status: 400 });

  const { error } = await db.from("manual_refunds").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: "수정 중 오류가 발생했습니다." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** 잘못 적은 것 지우기 */
export async function DELETE(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const db = getSupabase();
  if (!db) return NextResponse.json(DB_NOT_CONFIGURED, { status: 503 });

  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "id 가 필요합니다." }, { status: 400 });
  const { error } = await db.from("manual_refunds").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "삭제 중 오류가 발생했습니다." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
