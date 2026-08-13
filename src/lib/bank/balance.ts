/**
 * 현장 잔금 판별 — "이건 예약금이 아니라, 오늘 플레이하러 와서 낸 나머지 돈이다"
 *
 * [왜 필요한가]
 *  자동매칭(matcher.ts)은 **입금을 기다리는 예약**만 뒤진다. 그런데 잔금은 이미 예약금을 내고
 *  **확정된** 손님이 보내는 돈이라 애초에 후보에 없다 → 아무리 기다려도 "맞는 예약 없음" 이 뜬다.
 *  사장님 화면에 손댈 일 없는 돈이 매일 쌓여서, 정작 진짜 문제(오송금·이름 다름)가 묻힌다.
 *
 * [무엇으로 구분하나 — 시각]
 *  예약금은 **예약한 직후**(보통 며칠 전)에 들어오고, 잔금은 **플레이 직전**에 들어온다.
 *  실제 사례: 김혜진 님 플레이 18:40 / 입금 18:33 — 7분 전. (2026-08-13)
 *  → 이름이 같은 **확정된 예약**의 시작 시각이 입금 시각 앞뒤 1시간 안이면 잔금으로 본다.
 *
 * [안전]
 *  여기서 예약을 건드리지 않는다. 딱지만 붙인다. 잘못 붙어도 돈이 움직이지 않는다.
 *  또 이 판별은 matcher 가 **아무 예약도 못 찾았을 때만** 돌기 때문에,
 *  진짜 예약금(대기 중 예약)을 잔금으로 오해할 일이 없다.
 */

/** 앞뒤 1시간 (2026-08-13 사장님 지정) */
export const BALANCE_WINDOW_MS = 60 * 60 * 1000;

export type ConfirmedRow = {
  id: string;
  name: string;
  theme_name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
};

export type BalanceMatch = {
  reservation: ConfirmedRow;
  /** 플레이 시각 − 입금 시각 (분). 음수면 플레이가 이미 시작된 뒤 입금. */
  minutesToPlay: number;
  /** 창 안에 든 확정 예약이 몇 건이었나. 2 이상이면 사람이 한 번 봐야 한다. */
  total: number;
};

function normalizeName(s: string): string {
  return (s || "").replace(/\s+/g, "").normalize("NFC").toLowerCase();
}

/** 예약의 시작 시각(한국) → ms. 값이 이상하면 NaN. */
export function playStartMs(date: string, time: string): number {
  return new Date(`${date}T${time}:00+09:00`).getTime();
}

/**
 * 입금 시각 기준으로 앞뒤 1시간 안에 시작하는 **같은 이름의 확정 예약**을 찾는다.
 * 여러 건이면 시각이 가장 가까운 것을 고르되, total 로 몇 건이었는지 함께 알려준다.
 */
export function findBalanceMatch(
  depositorName: string,
  receivedAtMs: number,
  confirmed: ConfirmedRow[],
  windowMs: number = BALANCE_WINDOW_MS,
): BalanceMatch | null {
  const dn = normalizeName(depositorName);
  if (!dn) return null;

  const hits = confirmed
    .filter((r) => normalizeName(r.name) === dn)
    .map((r) => ({ r, gap: playStartMs(r.date, r.time) - receivedAtMs }))
    .filter((x) => Number.isFinite(x.gap) && Math.abs(x.gap) <= windowMs)
    .sort((a, b) => Math.abs(a.gap) - Math.abs(b.gap));

  const best = hits[0];
  if (!best) return null;
  return {
    reservation: best.r,
    minutesToPlay: Math.round(best.gap / 60000),
    total: hits.length,
  };
}

/**
 * 입금 시각(ms)을 기준으로 확정 예약을 훑을 날짜 목록 — 어제·오늘·내일(한국 날짜).
 * 자정 근처 입금이 하루 밀려 안 잡히는 일을 막으려고 앞뒤를 함께 본다.
 */
export function kstDatesAround(ms: number): string[] {
  const day = 86_400_000;
  return [-day, 0, day].map((d) => new Date(ms + d + 9 * 3_600_000).toISOString().slice(0, 10));
}

/** 화면에 쓸 한 줄 설명. "7분 전" 처럼 사람 말로. */
export function balanceReason(m: BalanceMatch): string {
  const n = Math.abs(m.minutesToPlay);
  const when = m.minutesToPlay >= 0 ? `${n}분 전` : `시작 ${n}분 뒤`;
  const many = m.total > 1 ? ` (같은 시간대 확정 예약이 ${m.total}건이라 가장 가까운 것으로 골랐습니다)` : "";
  return `플레이 ${when}에 들어온 돈이라 **현장에서 낸 잔금**으로 봤습니다. 예약은 이미 확정돼 있어 손댈 것이 없습니다.${many}`;
}
