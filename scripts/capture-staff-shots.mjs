/* 직원 교육용 설명서에 넣을 화면 사진 (읽기 전용)
 *   node scripts/capture-staff-shots.mjs [주소]
 *
 * ⚠️ 취소·시간변경은 **요청을 가로채** 가짜로 성공시킨다. 진짜 예약은 취소되지 않는다.
 * ⚠️ 관리자 사진의 손님 이름·연락처는 찍기 직전에 가린다(화면 글자만, DB 는 그대로).
 *
 * 환불율 100/80/0 을 각각 보여주려고 **날짜를 계산해서** 가짜 예약을 만든다:
 *   100% = 한 달 뒤 · 80% = 내일이지만 24시간 안 남은 시각 · 0% = 오늘
 */
import { chromium } from "playwright";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
config({ path: "D:/test3/fantastrick-homepage/.env.local" });

const BASE = process.argv[2] || "https://fantastrick.co.kr";
const OUT = "docs/_deck/shots";
fs.mkdirSync(OUT, { recursive: true });

/* ── 환불율 100/80/0 을 확실하게 보여주려고 **화면의 시계를 고정**한다 ──
 *
 * ⚠️ 진짜 시각에 맞춰 날짜를 계산하려다 틀렸다(2026-08-17). 새벽 0시 반에 돌리면
 *    "내일 10시"가 33시간 뒤가 되어 80% 가 아니라 100% 로 나온다.
 *    80% 구간(= 내일이면서 24시간 미만)은 시각에 따라 아주 좁아진다.
 *    → 화면 시계를 8월 19일(수) 14:00 로 고정하고 날짜를 박아 쓴다. 언제 돌려도 같은 그림이 나온다. */
const FIXED_KST = "2026-08-19T14:00:00+09:00";
const FIXED_MS = Date.parse(FIXED_KST);
const today = "2026-08-19";      // 고정 시계의 '오늘'
const tomorrow = "2026-08-20";
const farFuture = "2026-09-16";
const soonTime = "10:00";        // 8/20 10:00 = 20시간 뒤 → 24시간 미만 & 오늘 아님 → 80%
const todayTime = "20:00";       // 8/19 20:00 = 오늘 → 0%

/** 페이지 안의 시계를 고정한다(그 페이지에서만. 서버·DB 와 무관) */
async function freezeClock(page) {
  await page.addInitScript((base) => {
    const Real = Date;
    function Fake(...a) { return a.length ? new Real(...a) : new Real(base); }
    Fake.prototype = Real.prototype;
    Fake.now = () => base;
    Fake.parse = Real.parse;
    Fake.UTC = Real.UTC;
    window.Date = Fake;
  }, FIXED_MS);
}

const R = (over) => ({ id: "x", store_id: "gangnam1", theme_id: "ldc", theme_name: "락다운 시티",
  people: 4, name: "홍길동", deposit: 40000, deposit_paid: true, status: "confirmed", changed: false, ...over });

const CASES = {
  full: { ok: true, reservations: [R({ id: "r100", date: farFuture, time: "19:00" })] },          // 100%
  part: { ok: true, reservations: [R({ id: "r80", date: tomorrow, time: soonTime })] },           // 80%
  none: { ok: true, reservations: [R({ id: "r0", date: today, time: todayTime })] },              // 0%
};

const b = await chromium.launch({ channel: "chrome" });
const done = [];

async function save(page, name, w = 1200, opts = {}) {
  const tmp = path.join(OUT, name + ".png");
  await page.screenshot({ path: tmp, ...opts });
  await sharp(tmp).resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 })
    .toFile(path.join(OUT, name + ".webp"));
  fs.unlinkSync(tmp);
  done.push(name);
  console.log(`  ✔ ${name}  ${Math.round(fs.statSync(path.join(OUT, name + ".webp")).size / 1024)}KB`);
}

async function closeNotice(page) {
  for (let i = 0; i < 14; i++) {
    if (await page.locator(".nt-overlay").count()) {
      await page.locator(".nt-modal .close-x").click({ force: true }).catch(() => {});
      await page.waitForTimeout(240);
      if (!(await page.locator(".nt-overlay").count())) return;
    }
    await page.waitForTimeout(200);
  }
}

/** 조회 → 목록이 뜬 상태까지 */
async function lookup(page, data) {
  await freezeClock(page);
  await page.route("**/api/reservations?*", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) }));
  // 취소·시간변경 요청은 진짜로 보내지 않는다
  await page.route("**/api/reservations/cancel", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, refundRate: 100 }) }));
  await page.route("**/api/reservations/change", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }));
  await page.goto(`${BASE}/reservation`, { waitUntil: "networkidle" });
  await closeNotice(page);
  await page.fill('input[placeholder="예약 때 입력한 이름"]', "홍길동");
  await page.fill('input[type="tel"]', "010-1234-5678");
  await page.fill('input[type="password"]', "1234");
  await page.getByRole("button", { name: /예약 조회/ }).click();
  await page.waitForTimeout(1200);
}

/* ── 조회 화면 자체 (직원이 손님에게 안내할 화면) ── */
console.log("■ 조회 화면");
{
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  await freezeClock(page);
  await page.goto(`${BASE}/reservation`, { waitUntil: "networkidle" });
  await closeNotice(page);
  await page.waitForTimeout(600);
  await save(page, "lookup-form");           // 아직 조회 전 — 무엇을 입력하는지
  await ctx.close();
}
{
  // 취소된 예약이 목록에서 어떻게 보이는지 (= "취소 문자 안 와요" 응대 근거)
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  await lookup(page, { ok: true, reservations: [
    R({ id: "c1", date: farFuture, time: "19:00", status: "cancelled" }),
    R({ id: "k1", date: farFuture, time: "21:00" }),
  ]});
  await save(page, "lookup-cancelled");
  await ctx.close();
}

/* ── 취소 1단계: 환불 규정 안내 (100 / 80 / 0) ── */
console.log("■ 취소 흐름");
for (const [key, name] of [["full", "cancel-100"], ["part", "cancel-80"], ["none", "cancel-0"]]) {
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  await lookup(page, CASES[key]);
  await page.getByRole("button", { name: "예약 취소" }).first().click();
  await page.waitForTimeout(700);
  await save(page, name);
  // 100% 건에서는 다음 단계(계좌 입력)와 완료 팝업까지 이어서 찍는다
  if (key === "full") {
    const next = page.getByRole("button", { name: /동의 · 환불 계좌 입력|환불 계좌 입력/ }).first();
    if (await next.count()) { await next.click(); await page.waitForTimeout(600); await save(page, "cancel-account"); }
    const confirmBtn = page.getByRole("button", { name: /취소 확정|확정/ }).last();
    if (await confirmBtn.count()) {
      await page.fill("#rf-bank", "카카오뱅크").catch(() => {});
      await page.fill("#rf-acct", "3333097175706").catch(() => {});
      await page.fill("#rf-holder", "홍길동").catch(() => {});
      await confirmBtn.click().catch(() => {});
      await page.waitForTimeout(1200);
      if (await page.locator(".modal", { hasText: "예약 취소 안내" }).count()) await save(page, "cancel-done");
      else console.log("  ⚠ 취소 완료 팝업 못 띄움");
    }
  }
  await ctx.close();
}

/* ── 시간 변경 ── */
console.log("■ 시간 변경");
{
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  await lookup(page, CASES.full);
  const btn = page.getByRole("button", { name: "시간 변경" }).first();
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(1200);
    await save(page, "change-modal");
    // 고를 수 있는 날짜·시간을 눌러 완료 팝업까지
    /* ⚠️ 아무 날짜나 고르면 그날 시간이 전부 마감이라 [이 시간으로 변경] 이 계속 꺼져 있다
       (실제 예약 자료를 쓰기 때문). 고를 수 있는 시간이 나올 때까지 날짜를 옮겨본다. */
    const days = page.locator(".modal button.rcal-cell:not(.past):not(.locked):not(.empty):not([disabled])");
    const n = await days.count();
    let picked = false;
    for (let d = 0; d < n && !picked; d++) {
      await days.nth(d).click().catch(() => {});
      await page.waitForTimeout(1100);
      if (await page.locator(".modal button.opt:not([disabled])").count()) {
        await page.locator(".modal button.opt:not([disabled])").first().click();
        picked = true;
      }
    }
    if (!picked) { console.log("  ⚠ 고를 수 있는 시간이 있는 날짜가 없음 — 변경 완료 팝업 건너뜀"); }
    else {
      await page.waitForTimeout(500);
      await page.getByRole("button", { name: "이 시간으로 변경" }).click();
      await page.waitForTimeout(1500);
    }
    if (await page.locator(".modal", { hasText: "예약 시간이 변경되었습니다" }).count()) await save(page, "change-done");
    else console.log("  ⚠ 변경 완료 팝업 못 띄움");
  } else console.log("  ⚠ [시간 변경] 버튼 없음");
  await ctx.close();
}

/* ── 관리자: 환불 처리 · 시간변경 내역 ── */
console.log("■ 관리자 (이름·연락처 가림)");
{
  const ctx = await b.newContext({ viewport: { width: 1500, height: 980 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/admin", { waitUntil: "networkidle" });
  await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD || "");
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForTimeout(2500);

  async function mask() {
    await page.evaluate(() => {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const jobs = []; while (w.nextNode()) jobs.push(w.currentNode);
      for (const t of jobs) {
        if (!t.nodeValue || !t.nodeValue.trim()) continue;
        t.nodeValue = t.nodeValue.replace(/01[016789][-\s]?\d{3,4}[-\s]?\d{4}/g, "010-1234-5678")
          .replace(/\b\d{4}-?\d{2}-?\d{6,7}\b/g, "0000-00-0000000");
      }
      const st = document.createElement("style");
      st.textContent = `.who,.who *,.s-guest,.rf-who,.refund-warn,.acct,[data-mask]{filter:blur(4.5px)!important}`;
      document.head.appendChild(st);
      document.querySelectorAll("b,span,button,td,div").forEach((el) => {
        if (el.children.length > 2) return;
        const t = (el.textContent || "").trim();
        if (t.length > 40) return;
        if (/^[가-힣]{2,4}\s*·\s*\d+명$/.test(t) || /010-1234-5678/.test(t) ||
            (/^[가-힣]{2,4}$/.test(t) && el.tagName === "B")) el.setAttribute("data-mask", "");
      });
    });
  }

  if (await page.locator('input[type="password"]').count()) {
    console.log("  ⚠ 로그인 실패 — 건너뜁니다");
  } else {
    // 입금·환불 → 환불 처리
    await page.locator(".subtab a").filter({ hasText: "입금·환불" }).first().click();
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: /환불 처리/ }).first().click().catch(() => {});
    await page.waitForTimeout(1400);
    await mask(); await page.waitForTimeout(200);
    await save(page, "admin-refund", 1400);

    // 예약 → 시간변경 내역
    await page.locator(".subtab a").filter({ hasText: "예약" }).first().click();
    await page.waitForTimeout(1300);
    await page.getByRole("button", { name: /시간변경/ }).first().click().catch(() => {});
    await page.waitForTimeout(1400);
    await mask(); await page.waitForTimeout(200);
    await save(page, "admin-moved", 1400);

    /* 예약 상세 — 비밀번호 재발급·이름 수정이 여기 있다(직원 응대에 자주 쓰임).
       ⚠️ 여는 것까지만. 안에서는 아무 버튼도 누르지 않는다. */
    await page.locator(".subtab a").filter({ hasText: "예약" }).first().click();
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: /날짜별/ }).first().click().catch(() => {});
    await page.waitForTimeout(1200);
    const guest = page.locator("button.s-guest").first();
    if (await guest.count()) {
      await guest.click();
      await page.waitForTimeout(1300);
      await mask(); await page.waitForTimeout(200);
      await save(page, "admin-detail", 1400);
    } else console.log("  ⚠ 예약 상세를 열 손님 줄이 없음");
  }
  await ctx.close();
}

await b.close();
console.log(`\n■ ${done.length}장 → ${OUT}`);
console.log(`   (환불율 예시 날짜: 100%=${farFuture} 19:00 · 80%=${tomorrow} ${soonTime} · 0%=${today} ${todayTime})`);
