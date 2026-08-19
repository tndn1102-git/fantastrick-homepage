/* ⏳ 임시 — 옛 워드프레스 예약 플러그인("Booked") 모양으로 답해주기
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ 이 파일은 **없어질 파일이다.** 없애는 조건은 맨 아래에 적어뒀다.
 *
 * [왜 있나]
 *   방탈출 예약 모아보기 앱(빠방)은 매장마다 수집 코드를 따로 짜서 쓴다
 *   (2026-08-19 실측: 시간이 채워진 매장 134곳의 예약 주소가 32가지로 전부 다른 시스템).
 *   우리 몫 코드는 **옛 워드프레스 + Booked 플러그인**을 읽도록 짜여 있어서,
 *   홈페이지를 새로 만들며 그 플러그인이 사라지자 수집이 통째로 멈췄다.
 *   → 그쪽이 새 API 로 옮길 때까지, 우리가 옛 모양으로 답해 노출을 살려둔다.
 *
 * [규격 출처]  전부 실물에서 확보했다(추측 아님).
 *   · 기록보관소(web.archive.org)에 남은 2022-01-17 자 `/booking/` 페이지 → 달력 표 모양
 *   · 같은 곳의 `booked/assets/js/functions.js?ver=2.2.6` → 주고받는 명령과 버튼 속성
 *   · 같은 곳의 `booked-ltr.css` → 시간칸 내부 구조
 *   실제 오가는 방식:
 *       POST /wp-admin/admin-ajax.php
 *         action=booked_calendar_date   date=YYYY-MM-DD  calendar_id=17
 *         action=booked_calendar_month  gotoMonth=…      calendar_id=17
 *       답: 화면에 그대로 끼워넣는 HTML 조각
 *
 * ⚠️ 여기엔 **계산이 없다.** 값은 전부 src/lib/availability.ts 에서 가져온다.
 *    그래서 이 파일을 통째로 지워도 예약 화면·공개 API 는 아무 영향이 없다.
 *
 * ────────────────────────────────────────────────────────────────────────
 * 🗑 없애는 조건 (셋 다 만족하면 지운다)
 *   ① 빠방이 /api/availability 로 옮겨서 그쪽 목록에 우리 시간이 정상으로 뜬다
 *   ② `/wp-admin/admin-ajax.php` 로 오는 요청이 하루 100건 아래로 떨어진다
 *   ③ 클라우드플레어 "항상 HTTPS 사용" 을 다시 켜도 되는 상태가 된다
 *      (`node scripts/cf-always-https.mjs on` — 지금은 이 땜빵 때문에 꺼져 있다)
 *   지울 때 같이 지울 것: src/app/wp-admin/ · src/app/booking/route.ts ·
 *                        middleware 의 http 처리와 admin-ajax 예외 · scripts/waf-ajax.mjs
 * ────────────────────────────────────────────────────────────────────────
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { themeById } from "@/lib/data";
import { availabilityRange, availabilityOne, kstToday, kstDatePlus } from "@/lib/availability";

/** 달력 번호 ↔ 우리 테마.
 *  **짐작이 아니라 실제로 들어온 값이다** — 2026-08-19 창구 기록에서 17 · 23 · 24 세 가지를 확인했다.
 *    · 17 = 태초의 신부 (보관본 페이지에도 이 번호가 찍혀 있었다 — 확정)
 *    · 23 · 24 = 사자의 서 / 락다운시티. 들어온 값만으론 어느 쪽인지 알 수 없어 **만든 순서**로 정했다
 *      (워드프레스 번호는 만든 순서대로 붙는다. 등록일 = 태초의 신부 2021 → 사자의 서 2023 → 락다운시티 2025).
 *  ✅ 맞는지 확인하는 법: 두 테마는 시간표가 확연히 다르다.
 *      사자의 서 = 13:40 · 14:50 …(70분 간격) / 락다운시티 = 13:00 · 15:00 …(정각)
 *      그쪽 목록의 방에 엉뚱한 시간표가 뜨면 아래 23·24 를 서로 바꾸면 된다. */
export const CALENDARS: { id: number; theme: string }[] = [
  { id: 17, theme: "firstfoundbride" }, // 태초의 신부 (1호점)
  { id: 23, theme: "bookofduat" },      // 사자의 서 (2호점)
  { id: 24, theme: "ldc" },             // LOCKDOWN CITY (TGC)
];

/** 달력 번호(또는 테마 이름표) → 테마 이름표. 못 알아보면 undefined. */
export function themeOfCalendar(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const t = raw.trim();
  return CALENDARS.find((c) => String(c.id) === t)?.theme
      ?? (CALENDARS.some((c) => c.theme === t) ? t : undefined);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** "14:30" → "오후 2:30" (옛 페이지가 한국어였다) */
function ampm(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")}`;
}

/** 하루치 시간 목록 — 플러그인이 날짜를 눌렀을 때 돌려주던 조각.
 *  ⚠️ **예약 가능한 시간만 그린다.** 그래야 받는 쪽이 어떻게 읽든 "그려진 것 = 예약 가능" 이다.
 *  ⚠️ 제목(h2)에는 날짜만 넣는다 — 진짜 플러그인이 그랬다. 뒤에 딴 글자를 붙이면
 *     받는 쪽이 날짜를 못 읽을 수 있다. 테마 이름은 감싼 상자의 data-theme-name 으로 알린다. */
export function apptListHtml(date: string, times: string[], themeName: string, calId?: number): string {
  const [y, m, d] = date.split("-");
  const head = `<h2><i class="booked-icon booked-icon-calendar"></i> ${Number(y)}년 ${Number(m)}월 ${Number(d)}일</h2>`;
  const open = `<div class="booked-appt-list shown" data-date="${date}" data-theme-name="${esc(themeName)}">`;
  if (!times.length) {
    return `${open}${head}\n<p class="booked-no-appts">예약 가능한 시간이 없습니다.</p>\n</div>`;
  }
  /* 버튼에 붙는 값이 중요하다 — 진짜 플러그인은 버튼에서 data-title · data-timeslot ·
     data-date · data-calendar-id 를 읽어 예약 창을 연다(보관본 functions.js).
     받는 쪽이 글자 대신 버튼을 읽을 수도 있어 똑같이 붙여준다. */
  const slots = times.map((t) => {
    const at = `data-title="" data-timeslot="${t}" data-time="${t}" data-date="${date}"${calId ? ` data-calendar-id="${calId}"` : ""}`;
    return `<div class="timeslot" ${at}>
<div class="timeslot-time"><i class="booked-icon booked-icon-clock"></i> <span class="timeslot-range">${t}</span> <span class="timeslot-ampm">${ampm(t)}</span></div>
<div class="timeslot-people"><button type="button" class="button" ${at}><span class="spots-available">1 자리</span> 예약하기</button></div>
</div>`;
  }).join("\n");
  return `${open}${head}\n${slots}\n</div>`;
}

/** 한 달 달력 표 — 플러그인이 달을 넘길 때 돌려주던 조각. */
export function monthHtml(calId: number, monthStart: string, openByDate: Record<string, string[]>): string {
  const [Y, M] = monthStart.split("-").map(Number);
  const lead = new Date(Date.UTC(Y, M - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(Y, M, 0)).getUTCDate();
  const today = kstToday();

  const cells: string[] = [];
  const blank = (cls: string) => `<td class="${cls}"><span class="date"><span class="number"></span></span></td>`;
  for (let i = 0; i < lead; i++) cells.push(blank("prev-month prev-date"));
  for (let d = 1; d <= days; d++) {
    const iso = `${Y}-${String(M).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const n = (openByDate[iso] || []).length;
    const cls = iso < today ? "prev-date" : iso === today ? "today" : n ? "" : "booked-full";
    cells.push(`<td data-date="${iso}" data-available="${n}" class="${cls}"><span class="date"><span class="number">${d}</span></span></td>`);
  }
  while (cells.length % 7) cells.push(blank("next-month prev-date"));

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

/** 옛 예약 페이지 통째로 — 달력 3개 + 앞으로 며칠치 시간 목록.
 *  `/booking/` 과 창구의 "값 없는 요청" 이 같이 쓴다.
 *  ⚠️ 테마 3개가 한 답에 담긴다. 받는 쪽이 구조를 안 보고 시간만 긁으면 섞여 보일 수 있어
 *     테마마다 booked-calendar-shortcode-wrap(+data-theme, 제목)으로 칸을 확실히 나눠 둔다. */
export async function bookedPageHtml(db: SupabaseClient, ajaxUrl: string, daysAhead = 10): Promise<string> {
  const from = kstToday(), to = kstDatePlus(daysAhead);
  const [Y, M] = from.split("-").map(Number);
  const mm = String(M).padStart(2, "0");
  const monthEnd = `${Y}-${mm}-${new Date(Date.UTC(Y, M, 0)).getUTCDate()}`;

  const blocks = await Promise.all(CALENDARS.map(async (c) => {
    const name = themeById(c.theme)?.name || c.theme;
    const rows = await availabilityRange(db, c.theme, `${Y}-${mm}-01`, monthEnd > to ? monthEnd : to);
    const byDate: Record<string, string[]> = {};
    rows.forEach((r) => { byDate[r.date] = r.open; });
    const lists = rows.filter((r) => r.date >= from && r.date <= to)
      .map((r) => apptListHtml(r.date, r.open, name, c.id)).join("\n");
    return `<div class="booked-calendar-shortcode-wrap" data-calendar-id="${c.id}" data-theme="${c.theme}">
<h3 class="booked-calendar-title">${esc(name)}</h3>
${monthHtml(c.id, `${Y}-${mm}-01`, byDate)}
${lists}
</div>`;
  }));

  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8">
<title>예약 - 판타스트릭</title>
<script type="text/javascript">
var booked_js_vars = {"ajax_url":"${ajaxUrl}","profilePage":"https://fantastrick.co.kr/reserve","publicAppointments":""};
</script>
</head><body class="booked-ltr">
<div id="booked-page-form">
${blocks.join("\n")}
</div>
<!-- 예약 가능한 시간만 그려져 있습니다. 정식 연동은 https://fantastrick.co.kr/reservation-api -->
</body></html>`;
}

/** 창구가 쓰는 하루치 조회 — 계산은 availability.ts 가 한다 */
export async function openTimes(db: SupabaseClient, themeId: string, date: string): Promise<string[]> {
  return (await availabilityOne(db, themeId, date)).open;
}
export { kstToday };
