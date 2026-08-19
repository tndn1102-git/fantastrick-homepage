/* 예약 가능 시간 계산 — **이 프로젝트에서 유일한 출처**
 * ─────────────────────────────────────────────────────────────────────────
 * "그 테마 그 날짜에 몇 시가 비어 있나" 를 답하는 곳은 여기 하나다.
 *
 * [왜 따로 뺐나]
 *   2026-08-19 외부 연동 작업을 하다 보니 같은 계산이 세 군데로 흩어졌다
 *   (예약 화면용 /api/slots · 옛 플러그인 흉내 · 공개 API).
 *   흩어지면 한 곳만 고치고 다른 곳을 잊는 순간 **손님 화면과 밖에 알린 값이 어긋난다.**
 *   그래서 계산은 여기 한 곳에 두고, 나머지는 모양만 입힌다.
 *
 * [무엇이 "닫힌 시간" 인가]  세 가지를 합친 것이다.
 *   ① 관리자가 막아둔 시간(blocked_slots) — 시간이 비어 있으면 그날 통째로 휴무
 *   ② 이미 예약이 찬 시간(reservations, 취소 제외)
 *   ③ 그 요일에 아예 회차가 없는 경우 (시간표에서 안 나온다)
 *
 * ⚠️ 회차 시간표는 slotsForThemeDate 하나로만 구한다.
 *    테마 시간표 > 매장 시간표 > 전역 시간표 순서와 요일 처리가 거기 다 들어 있다.
 * ⚠️ "지난 시간" 은 걸러내지 않는다. 지금이 몇 시인지는 **보는 쪽 시계**로 판단할 일이다.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { slotsForThemeDate, themeById } from "@/lib/data";
import { getConfig } from "@/lib/settings";

/** 하루치 결과. slots = 그날 회차 전부 · open = 예약 가능 · closed = 막힌 것(마감+예약참) */
export type DayAvailability = {
  date: string;
  slots: string[];
  open: string[];
  closed: string[];
};

/** 오늘(한국 시간) YYYY-MM-DD */
export function kstToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

/** 한국 시간 기준 며칠 뒤 YYYY-MM-DD */
export function kstDatePlus(days: number): string {
  return new Date(Date.now() + 9 * 3600 * 1000 + days * 86400000).toISOString().slice(0, 10);
}

/** from~to 사이 모든 날짜의 예약 현황.
 *  ⚠️ 날짜마다 DB를 부르지 않는다 — 한 달이면 90번이 넘는다. **질문 3번으로 끝낸다.** */
export async function availabilityRange(
  db: SupabaseClient, themeId: string, from: string, to: string,
): Promise<DayAvailability[]> {
  const [{ data: bs }, { data: rv }, cfg] = await Promise.all([
    db.from("blocked_slots").select("theme_id, date, time").gte("date", from).lte("date", to),
    db.from("reservations").select("date, time").eq("theme_id", themeId)
      .gte("date", from).lte("date", to).neq("status", "cancelled"),
    getConfig(),
  ]);

  const closedByDate: Record<string, Set<string>> = {};
  const dayOff = new Set<string>();
  for (const b of (bs || []) as { theme_id: string | null; date: string; time: string | null }[]) {
    if (b.theme_id && b.theme_id !== themeId) continue;  // 다른 테마의 차단은 상관없다
    if (!b.time) { dayOff.add(b.date); continue; }        // 시간이 없으면 그날 통째로 휴무
    (closedByDate[b.date] ||= new Set()).add(b.time);
  }
  for (const r of (rv || []) as { date: string; time: string }[]) {
    (closedByDate[r.date] ||= new Set()).add(r.time);
  }

  const store = themeById(themeId)?.store;
  const out: DayAvailability[] = [];
  for (let d = new Date(from + "T00:00:00Z"); d.toISOString().slice(0, 10) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = d.toISOString().slice(0, 10);
    const slots = slotsForThemeDate(cfg.themeSlots, cfg.storeSlots, cfg.timeSlots, themeId, store, date);
    if (dayOff.has(date)) { out.push({ date, slots, open: [], closed: slots }); continue; }
    const shut = closedByDate[date];
    const open = shut ? slots.filter((t) => !shut.has(t)) : slots;
    out.push({ date, slots, open, closed: slots.filter((t) => !open.includes(t)) });
  }
  return out;
}

/** 하루치만 필요할 때 */
export async function availabilityOne(
  db: SupabaseClient, themeId: string, date: string,
): Promise<DayAvailability> {
  const [one] = await availabilityRange(db, themeId, date, date);
  return one ?? { date, slots: [], open: [], closed: [] };
}
