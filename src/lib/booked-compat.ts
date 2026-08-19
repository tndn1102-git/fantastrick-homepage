/* 옛 워드프레스 예약 플러그인("Booked") **흉내내기**
 * ─────────────────────────────────────────────────────────────────────────
 * [왜 이런 걸 만드나]
 *   방탈출 예약 모아보기 앱(빠방)은 **매장마다 수집 코드를 따로 짜서** 쓴다
 *   (2026-08-19 실측: 시간이 채워진 매장 134곳의 예약 주소가 32가지로 전부 다른 시스템이었다).
 *   우리 몫으로 짜인 코드는 **옛 워드프레스 + Booked 플러그인**을 읽도록 만들어져 있다.
 *   홈페이지를 새로 만들면서 그 플러그인이 사라지자, 그쪽 수집이 통째로 멈췄다.
 *     · 그쪽 목록의 우리 방 3개 모두 "예약 가능 시간" 이 7일치 전부 빈 값
 *     · 그런데도 하루 5,884번 `/wp-admin/admin-ajax.php` 를 두드리고 있다
 *       (referer 가 `http://fantastrick.co.kr/booking/` — 그쪽에 등록된 우리 예약 링크와 같다)
 *   고쳐달라고 연락했지만 안 고쳐줬다. → **우리가 옛 플러그인인 척 해서 해결한다.**
 *
 * [규격은 어디서 가져왔나]  전부 실물에서 확보했다(추측 아님).
 *   · 인터넷 기록보관소(web.archive.org)에 남은 2022-01-17 자 `/booking/` 페이지
 *   · 같은 곳에 남은 플러그인 스크립트 `booked/assets/js/functions.js?ver=2.2.6`
 *   거기서 확인한 실제 주고받는 방식:
 *       POST /wp-admin/admin-ajax.php
 *         action=booked_calendar_month        gotoMonth=YYYY-MM-DD  calendar_id=17
 *         action=booked_calendar_date         date=YYYY-MM-DD       calendar_id=17
 *         action=booked_appointment_list_date date=YYYY-MM-DD       calendar_id=17
 *       답: 화면에 그대로 끼워넣는 **HTML 조각**
 *   달력 표 모양도 보관본 그대로다:
 *       <div class="booked-calendar-wrap large">
 *         <table class="booked-calendar" data-calendar-id="17" data-calendar-date="2022-01-01">
 *           <td data-date="2022-01-19" class="">…
 *
 * ⚠️ 내보내는 값은 **우리 예약 화면과 같은 함수**로 계산한다(slotsForThemeDate).
 *    보여주기용 가짜 자료가 아니라 진짜 현황이다.
 * ⚠️ 마감된 시간은 아예 안 그린다. 그래야 "그려진 것 = 예약 가능" 이 되어
 *    상대 코드가 어떻게 읽든 틀릴 수가 없다.
 */
import { THEMES, slotsForThemeDate, themeById } from "@/lib/data";
import { getConfig } from "@/lib/settings";
import type { SupabaseClient } from "@supabase/supabase-js";

/** 달력 번호 ↔ 우리 테마.
 *  17 은 보관본에 실제로 찍혀 있던 번호다. 나머지 둘은 이어지는 번호로 붙였다.
 *  ⚠️ 그쪽이 옛날에 받아 적어둔 번호를 그대로 쓴다면 17 만 맞고 나머지는 다를 수 있다.
 *     그때는 `/wp-admin/admin-ajax.php` 로 들어오는 calendar_id 를 보고 여기만 고치면 된다
 *     (scripts/slots-clients.mjs · wrangler tail 로 확인). */
export const CALENDARS: { id: number; theme: string }[] = [
  { id: 17, theme: "firstfoundbride" }, // 태초의 신부 (1호점) — 보관본에 있던 번호
  { id: 18, theme: "bookofduat" },      // 사자의 서 (2호점)
  { id: 19, theme: "ldc" },             // LOCKDOWN CITY (TGC)
];

/** 달력 번호나 테마 이름표 아무거나 받아 테마 이름표로. 못 알아보면 undefined. */
export function themeOfCalendar(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const byNum = CALENDARS.find((c) => String(c.id) === raw.trim());
  if (byNum) return byNum.theme;
  return THEMES.some((t) => t.id === raw) ? raw : undefined;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 오늘(한국 시간) YYYY-MM-DD */
export function kstToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

/** 그 테마·그 날짜에 **아직 예약 가능한** 시간들. 우리 예약 화면과 같은 계산이다. */
export async function openTimes(db: SupabaseClient, themeId: string, date: string): Promise<string[]> {
  const [{ data: bs }, { data: rv }, cfg] = await Promise.all([
    db.from("blocked_slots").select("theme_id, time").eq("date", date),
    db.from("reservations").select("time").eq("theme_id", themeId).eq("date", date).neq("status", "cancelled"),
    getConfig(),
  ]);
  const mine = (bs || []).filter((b: { theme_id: string | null }) => !b.theme_id || b.theme_id === themeId);
  if (mine.some((b: { time: string | null }) => !b.time)) return []; // 그날 통째로 휴무
  const closed = new Set<string>([
    ...mine.filter((b: { time: string | null }) => b.time).map((b: { time: string }) => b.time),
    ...(rv || []).map((r: { time: string }) => r.time),
  ]);
  const all = slotsForThemeDate(
    cfg.themeSlots, cfg.storeSlots, cfg.timeSlots,
    themeId, themeById(themeId)?.store, date,
  );
  return all.filter((t) => !closed.has(t));
}

/** 여러 날짜치를 **한 번에** — 날짜마다 DB를 부르면 한 달이면 90번이 넘는다.
 *  차단·예약·설정을 각각 한 번씩만 받아 메모리에서 계산한다(DB 질문 3번으로 끝).
 *  돌려주는 값: { "2026-08-22": ["11:00", …], … } */
export async function openTimesRange(
  db: SupabaseClient, themeId: string, from: string, to: string,
): Promise<Record<string, string[]>> {
  const [{ data: bs }, { data: rv }, cfg] = await Promise.all([
    db.from("blocked_slots").select("theme_id, date, time").gte("date", from).lte("date", to),
    db.from("reservations").select("date, time").eq("theme_id", themeId).gte("date", from).lte("date", to).neq("status", "cancelled"),
    getConfig(),
  ]);
  const closedByDate: Record<string, Set<string>> = {};
  const dayOff = new Set<string>();
  for (const b of (bs || []) as { theme_id: string | null; date: string; time: string | null }[]) {
    if (b.theme_id && b.theme_id !== themeId) continue;   // 다른 테마의 차단은 무시
    if (!b.time) { dayOff.add(b.date); continue; }         // 시간이 없으면 그날 통째로 휴무
    (closedByDate[b.date] ||= new Set()).add(b.time);
  }
  for (const r of (rv || []) as { date: string; time: string }[]) (closedByDate[r.date] ||= new Set()).add(r.time);

  const store = themeById(themeId)?.store;
  const out: Record<string, string[]> = {};
  for (let d = new Date(from + "T00:00:00Z"); d.toISOString().slice(0, 10) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    if (dayOff.has(iso)) { out[iso] = []; continue; }
    const closed = closedByDate[iso];
    const all = slotsForThemeDate(cfg.themeSlots, cfg.storeSlots, cfg.timeSlots, themeId, store, iso);
    out[iso] = closed ? all.filter((t) => !closed.has(t)) : all;
  }
  return out;
}

/** "14:30" → "오후 2:30" (옛 페이지가 한국어였다. 숫자 HH:MM 도 같이 남긴다) */
function ampm(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ap = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ap} ${h12}:${String(m).padStart(2, "0")}`;
}

/** 하루치 시간 목록 HTML — 플러그인이 날짜를 눌렀을 때 돌려주던 조각.
 *  ⚠️ 예약 가능한 시간만 그린다(마감은 아예 안 나온다). */
export function apptListHtml(date: string, times: string[], themeName: string): string {
  const [y, m, d] = date.split("-");
  const head = `<h2><i class="booked-icon booked-icon-calendar"></i> ${Number(y)}년 ${Number(m)}월 ${Number(d)}일 · ${esc(themeName)}</h2>`;
  if (!times.length) {
    return `<div class="booked-appt-list">${head}\n<p class="booked-no-appts">예약 가능한 시간이 없습니다.</p>\n</div>`;
  }
  const slots = times.map((t) => `<div class="timeslot" data-timeslot="${t}" data-date="${date}">
<div class="timeslot-time"><i class="booked-icon booked-icon-clock"></i> <span class="timeslot-range">${t}</span> <span class="timeslot-ampm">${ampm(t)}</span></div>
<div class="timeslot-people"><span class="spots-available">1 자리</span> <button type="button" class="button">예약하기</button></div>
</div>`).join("\n");
  return `<div class="booked-appt-list">${head}\n${slots}\n</div>`;
}

/** 옛 예약 페이지 통째로 — 달력 3개 + 앞으로 10일치 시간 목록.
 *
 *  `/booking/` 과 `/wp-admin/admin-ajax.php`(값 없는 요청) 두 곳이 같이 쓴다.
 *
 *  [왜 값 없는 요청에도 이걸 주나]
 *    빠방 수집기는 **아무 값도 안 붙인 GET 만** 하루 5,900번 보낸다(2026-08-19 실측,
 *    방화벽을 열어 5분 30초 지켜본 30건 전부 그랬다). 옛 워드프레스는 여기에 "0" 한 글자를
 *    돌려줬으니, 그 상태로는 영영 아무 자료도 못 가져간다.
 *    → 물어보는 방식이 바뀔 가망이 없으므로, **지금 보내는 그 요청에 답을 실어준다.**
 *
 *  ⚠️ 테마 3개가 한 답에 같이 담긴다. 상대가 구조를 안 보고 시간만 긁으면
 *     세 테마 시간이 섞여 보일 수 있다. 그래서 테마마다
 *     `booked-calendar-shortcode-wrap`(+ data-theme, 제목)으로 확실히 칸을 나눠 둔다.
 *     그쪽 목록에 어떻게 반영되는지 보고 필요하면 나눠 주는 방식으로 바꾼다.
 */
export async function bookedPageHtml(db: SupabaseClient, ajaxUrl: string, daysAhead = 10): Promise<string> {
  const from = kstToday();
  const to = new Date(Date.now() + 9 * 3600 * 1000 + daysAhead * 86400000).toISOString().slice(0, 10);
  const [Y, M] = from.split("-").map(Number);
  const mm = String(M).padStart(2, "0");
  const monthEnd = `${Y}-${mm}-${new Date(Date.UTC(Y, M, 0)).getUTCDate()}`;

  const blocks = await Promise.all(CALENDARS.map(async (c) => {
    const name = themeById(c.theme)?.name || c.theme;
    const month = await openTimesRange(db, c.theme, `${Y}-${mm}-01`, monthEnd > to ? monthEnd : to);
    const cal = monthHtml(c.id, `${Y}-${mm}-01`, month);
    const lists = Object.keys(month).filter((d) => d >= from && d <= to)
      .map((d) => apptListHtml(d, month[d], name)).join("\n");
    return `<div class="booked-calendar-shortcode-wrap" data-calendar-id="${c.id}" data-theme="${c.theme}">
<h3 class="booked-calendar-title">${esc(name)}</h3>
${cal}
${lists}
</div>`;
  }));

  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8">
<title>예약 - 판타스트릭</title>
<script type="text/javascript">
/* 옛 플러그인이 심어두던 값 — 수집기가 여기서 창구 주소를 읽어간다 */
var booked_js_vars = {"ajax_url":"${ajaxUrl}","profilePage":"https://fantastrick.co.kr/reserve","publicAppointments":""};
</script>
</head><body class="booked-ltr">
<div id="booked-page-form">
${blocks.join("\n")}
</div>
<!-- 예약 가능한 시간만 그려져 있습니다. 실제 예약은 https://fantastrick.co.kr/reserve -->
</body></html>`;
}

/** 한 달 달력 표 HTML — 플러그인이 달을 넘길 때 돌려주던 조각.
 *  예약 가능한 날은 칸을 비워두고(선택 가능), 자리가 없는 날엔 booked-full 을 붙인다. */
export function monthHtml(calId: number, monthStart: string, openByDate: Record<string, string[]>): string {
  const [Y, M] = monthStart.split("-").map(Number);
  const first = new Date(Date.UTC(Y, M - 1, 1));
  const lead = first.getUTCDay();                       // 그 달 1일의 요일 (0=일)
  const days = new Date(Date.UTC(Y, M, 0)).getUTCDate(); // 그 달의 마지막 날짜
  const today = kstToday();

  const cells: string[] = [];
  for (let i = 0; i < lead; i++) cells.push(`<td class="prev-month prev-date"><span class="date"><span class="number"></span></span></td>`);
  for (let d = 1; d <= days; d++) {
    const iso = `${Y}-${String(M).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const open = (openByDate[iso] || []).length;
    const cls = iso < today ? "prev-date" : iso === today ? "today" : open ? "" : "booked-full";
    cells.push(`<td data-date="${iso}" data-available="${open}" class="${cls}"><span class="date"><span class="number">${d}</span></span></td>`);
  }
  while (cells.length % 7) cells.push(`<td class="next-month prev-date"><span class="date"><span class="number"></span></span></td>`);

  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(`<tr class="week">\n${cells.slice(i, i + 7).join("\n")}\n</tr>`);

  return `<div class="booked-calendar-wrap large">
<table class="booked-calendar" data-calendar-id="${calId}" data-calendar-date="${Y}-${String(M).padStart(2, "0")}-01">
<thead>
<tr><th colspan="7"><span class="monthName">${Y}년 ${M}월</span></th></tr>
<tr class="days"><th>일</th><th>월</th><th>화</th><th>수</th><th>목</th><th>금</th><th>토</th></tr>
</thead>
<tbody>
${rows.join("\n")}
</tbody>
</table>
</div>`;
}
