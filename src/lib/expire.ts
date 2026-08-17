import type { SupabaseClient } from "@supabase/supabase-js";
import { isRefundOwed, type MoneyRow } from "@/lib/money";
import { IMPORTED_SOURCE } from "@/lib/data";

// 미입금 예약 자동취소 (지연 정리 방식) — 접속 시점에 청소한다.
//
// 규칙 — **시간대와 상관없이 접수 후 30분.** 예외는 없다.
//
// 🔴 2026-08-17 — "자정 이후 접수분은 그날 오전 10시까지 봐준다"는 유예를 **없앴다**(사장님 지시).
//    새벽이라도 30분 뒤 자동취소로 간다. 직원 교육 자료도 그 기준으로 다시 만들었다.
//    (없앤 것: GRACE_UNTIL_HOUR · isInMidnightGrace() · kstMidnightIso() · 관리자 '새벽 예약' 표시)
//    ⚠️ 되살릴 거라면 **직원 자료(docs/_deck/*-template.html)와 손님 안내 문구도 같이** 되돌릴 것.
//       한쪽만 바꾸면 "새벽에도 30분"이라 안내해 놓고 실제로는 안 지워지는 어긋남이 생긴다.
//
// ⚠️ 아래 숫자를 바꾸면 손님에게 보이는 안내 문구(예약금 안내창)도 같이 바꿀 것.
export const EXPIRE_MINUTES = 30;      // 접수 후 이 시간 안에 입금이 없으면 취소 (화면 카운트다운도 이 값)

const KST_OFFSET = 9 * 3600 * 1000;

/* 🟢 자동취소 스위치 — **켜짐** (2026-08-17 사장님 지시)
 *
 * 접수 후 30분 안에 입금이 확인되지 않으면 시스템이 예약을 취소한다.
 * 시간대 예외는 없다(자정 유예는 2026-08-17 에 없앴다 — 위 주석 참고).
 *
 * [켜기 전에 확인한 것]
 *   "그동안 쌓인 오래된 미입금 건이 한꺼번에 취소되지 않는가" → 켤 시점에 **pending 0건**.
 *   ⚠️ 다시 껐다가 켤 일이 생기면 **그때도 이 확인을 먼저** 할 것. 며칠 꺼두면 미입금이 쌓이고,
 *      그 상태로 켜면 첫 정리에서 수십 건이 한 번에 취소된다.
 *
 * [언제 도는가] 접속할 때 청소하는 방식이라 따로 도는 시계가 없다. 아래 네 곳에서 부른다:
 *   /api/slots · /api/reservations · /api/admin/reservations · /api/bank/deposit
 *   → 예약칸 조회(/api/slots)가 2분마다 들어오므로 사실상 상시 돈다.
 *
 * [늦게 입금한 손님은 어떻게 되나]
 *   /api/bank/deposit 은 **정리를 먼저 돌리고** 짝을 찾는다(그 파일 4)번 주석).
 *   그래서 30분이 지난 뒤 들어온 입금은 짝이 없어 `no_match` 로 관리자에 남는다.
 *   → 돈은 들어왔는데 예약은 없는 상태다. **사장님이 환불하거나 자리를 다시 잡아준다.**
 *   이건 사고가 아니라 정해둔 동작이다(직원 설명서에도 같은 내용으로 적혀 있다).
 *
 * [끄려면] 이 값을 false 로. 안내 문구(예약금 안내창·직원 자료)도 같이 되돌릴 것.
 */
export const AUTO_CANCEL_ENABLED = true;

export async function sweepExpiredReservations(db: SupabaseClient): Promise<void> {
  if (!AUTO_CANCEL_ENABLED) return; // 잠금 — 위 주석 참고
  const now = Date.now();
  const cutoff = new Date(now - EXPIRE_MINUTES * 60 * 1000).toISOString();

  let q = db
    .from("reservations")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      // ⚠️ memo 는 절대 건드리지 않는다 — 기존 사이트에서 가져온 예약은 memo 통째로가
      //    가져오기 열쇠(#예약번호)라, 덮어쓰면 같은 예약을 또 가져오거나 못 알아본다.
      //    취소 표시는 전용 칸에 적는다(2026-08-01).
      auto_cancelled: true,
    })
    .eq("status", "pending")
    .eq("deposit_paid", false)
    .lt("created_at", cutoff)
    // 🔑 2026-08-07 — **기존 사이트에서 가져온 예약은 뺀다.**
    //   저 예약들의 입금 확인은 기존 사이트(와 매장)에서 일어난다. 우리 시계로 30분을 재면,
    //   저쪽에서 입금대기(draft)로 막 들어온 예약을 30분 뒤 죽이게 된다. 저쪽이 나중에
    //   승인해도 우리는 몰랐다 — **실제로 256건 중 35건이 그렇게 죽어 아침 안내문자에서
    //   손님이 누락됐다**(오늘만 3명).
    //   이제 그 예약들의 상태는 5분 동기화가 저쪽과 똑같이 맞춘다(scripts/import-from-wp.mts).
    //   ⚠️ 여기서 다시 넣으면 그 동기화와 서로 되돌리는 밀당이 된다(07-31 에 겪은 일이다).
    //      우리 사이트에서 직접 받은 예약(online·phone)은 그대로 이 만료가 주인이다.
    .neq("source", IMPORTED_SOURCE);

  await q;
}

// ─── 기록 보관 정책 (2026-07-21 사장님 지시) ──────────────────────────
//   · 이용/취소가 '일주일' 지나면 → 손님 조회 화면에서 숨김 (DB엔 남고, 관리자는 계속 봄)
//   · 이용/취소가 '한 달' 지나면 → DB에서 완전 삭제 (딸린 이력은 cascade 삭제, 입금기록은 링크만 해제)
//   ⚠️ 환불이 아직 안 끝난 취소건(돌려줄 돈 남음)은 한 달이 지나도 삭제하지 않는다 — 돈 기록이 사라지면 안 됨.
export const HIDE_AFTER_DAYS = 7;
export const DELETE_AFTER_DAYS = 30;

// 오늘 기준 N일 전의 한국 날짜("YYYY-MM-DD"). 이용일(date) 비교용.
function kstDateMinus(days: number, nowMs: number): string {
  return new Date(nowMs + KST_OFFSET - days * 86400000).toISOString().slice(0, 10);
}

// 손님 조회 화면에서 숨길 예약인가 — '끝난 지 일주일 넘은' 취소·이용완료.
//   · 취소건: 취소한 시각(cancelled_at) 기준
//   · 그 외(이용완료·노쇼 등, 또는 취소인데 취소시각이 없는 옛 데이터): 이용일(date) 기준
//   · 미래 예약·최근(일주일 내) 건은 그대로 보인다.
export function isHiddenFromLookup(
  r: { status: string; date: string; cancelled_at?: string | null },
  nowMs: number = Date.now(),
): boolean {
  if (r.status === "cancelled" && r.cancelled_at) {
    return Date.parse(r.cancelled_at) < nowMs - HIDE_AFTER_DAYS * 86400000;
  }
  return r.date < kstDateMinus(HIDE_AFTER_DAYS, nowMs);
}

// 한 달 지난 예약을 실제로 삭제. 삭제한 건수를 돌려준다.
//   이력(reservation_logs)은 FK on delete cascade 로 자동 삭제되고,
//   입금기록(deposits.matched_reservation_id)은 on delete set null 로 링크만 풀린다.
export async function purgeOldReservations(db: SupabaseClient, nowMs: number = Date.now()): Promise<number> {
  const cancelCutoff = new Date(nowMs - DELETE_AFTER_DAYS * 86400000).toISOString();
  const dateCutoff = kstDateMinus(DELETE_AFTER_DAYS, nowMs);
  // 후보: (취소된 지 한 달 넘음) 또는 (이용일이 한 달 넘게 지남)
  const { data, error } = await db
    .from("reservations")
    .select("id, status, deposit, deposit_paid, refunded, refund_rate, refund_account")
    .or(`and(status.eq.cancelled,cancelled_at.lt.${cancelCutoff}),date.lt.${dateCutoff}`);
  if (error || !data || data.length === 0) return 0;
  // 🔴 환불 안 끝난 취소건은 제외 — 돌려줄 돈이 남아있으면 절대 지우지 않는다.
  //    isRefundOwed(계좌 유무 무관)로 봐야, 사장님이 취소해 계좌를 아직 못 받은 건도 지켜진다.
  //    (예전 isRefundReady 기준은 계좌 없는 환불 대기건을 한 달 뒤 삭제해 돈+기록이 사라졌다)
  const ids = data
    .filter((r) => !isRefundOwed(r as MoneyRow))
    .map((r) => r.id as string);
  if (ids.length === 0) return 0;
  const { error: delErr } = await db.from("reservations").delete().in("id", ids);
  if (delErr) { console.error("[보관정책 삭제 실패]", delErr.message); return 0; }
  return ids.length;
}

// 삭제 sweep 을 너무 자주 돌리지 않게 인스턴스별 1시간에 한 번으로 제한.
//   (삭제 자체는 여러 번 돌아도 무해하지만, 매 요청마다 조회+삭제는 낭비라 throttle)
let lastPurgeMs = 0;
export async function maybePurgeOldReservations(db: SupabaseClient): Promise<void> {
  const now = Date.now();
  if (now - lastPurgeMs < 3600_000) return;
  lastPurgeMs = now;
  await purgeOldReservations(db, now).catch(() => {});
}
