/* 직원 설명서(모바일판)에 넣을 **폰 화면** 사진 (읽기 전용)
 *   node scripts/capture-mobile-shots.mjs [주소]
 *
 * [왜 따로 찍나]
 *   PC 화면(1200~1500px)을 폰(390px)에서 보면 글씨가 좁쌀만 해진다.
 *   직원이 폰으로 볼 자료이므로 **손님 화면은 폰 크기로 다시 찍는다**. 파일 이름은 m- 로 시작.
 *   (관리자 화면은 사장님 PC 에서 쓰는 것이라 PC 사진을 그대로 쓰고, 자료에서 눌러 확대한다)
 *
 * ⚠️ 취소·시간변경 요청은 가로채므로 **진짜 예약은 건드리지 않는다.**
 * ⚠️ 환불율 100/80/0 을 확실히 보여주려고 페이지 시계를 고정한다(실제 시각과 무관).
 */
import { chromium } from "playwright";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] || "https://fantastrick.co.kr";
const OUT = "docs/_deck/shots";
fs.mkdirSync(OUT, { recursive: true });

const FIXED_MS = Date.parse("2026-08-19T14:00:00+09:00");
const today = "2026-08-19", tomorrow = "2026-08-20", farFuture = "2026-09-16";

const R = (over) => ({ id: "x", store_id: "gangnam1", theme_id: "ldc", theme_name: "락다운 시티",
  people: 4, name: "홍길동", deposit: 40000, deposit_paid: true, status: "confirmed", changed: false, ...over });
const CASES = {
  full: { ok: true, reservations: [R({ id: "r100", date: farFuture, time: "19:00" })] },
  part: { ok: true, reservations: [R({ id: "r80", date: tomorrow, time: "10:00" })] },
  none: { ok: true, reservations: [R({ id: "r0", date: today, time: "20:00" })] },
  mixed: { ok: true, reservations: [
    R({ id: "c1", date: farFuture, time: "19:00", status: "cancelled" }),
    R({ id: "k1", date: farFuture, time: "21:00" })] },
  unpaid: { ok: true, reservations: [R({ id: "u1", date: farFuture, time: "19:00", deposit_paid: false, status: "pending" })] },
};

const b = await chromium.launch({ channel: "chrome" });
const made = [];

async function phone() {
  const ctx = await b.newContext({
    viewport: { width: 412, height: 900 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36",
  });
  const page = await ctx.newPage();
  await page.addInitScript((base) => {
    const Real = Date;
    function Fake(...a) { return a.length ? new Real(...a) : new Real(base); }
    Fake.prototype = Real.prototype; Fake.now = () => base; Fake.parse = Real.parse; Fake.UTC = Real.UTC;
    window.Date = Fake;
  }, FIXED_MS);
  return page;
}

async function save(page, name, opts = {}) {
  const tmp = path.join(OUT, "m-" + name + ".png");
  await page.screenshot({ path: tmp, ...opts });
  // 폰 화면은 824px(412×2) 로 찍히므로 그대로 두면 무겁다. 700px 로 줄여도 폰에선 또렷하다.
  await sharp(tmp).resize({ width: 700, withoutEnlargement: true }).webp({ quality: 76 })
    .toFile(path.join(OUT, "m-" + name + ".webp"));
  fs.unlinkSync(tmp);
  made.push(name);
  console.log(`  ✔ m-${name}  ${Math.round(fs.statSync(path.join(OUT, "m-" + name + ".webp")).size / 1024)}KB`);
}

async function closeNotice(page) {
  await page.waitForTimeout(1200);   // 그리기·자료 받기 여유(networkidle 은 챗봇 때문에 안 온다)
  for (let i = 0; i < 14; i++) {
    if (await page.locator(".nt-overlay").count()) {
      await page.locator(".nt-modal .close-x").click({ force: true }).catch(() => {});
      await page.waitForTimeout(240);
      if (!(await page.locator(".nt-overlay").count())) return;
    }
    await page.waitForTimeout(200);
  }
}

async function lookup(page, data) {
  await page.route("**/api/reservations?*", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) }));
  await page.route("**/api/reservations/cancel", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, refundRate: 100 }) }));
  await page.route("**/api/reservations/change", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }));
  await page.goto(`${BASE}/reservation`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await closeNotice(page);
  await page.fill('input[placeholder="예약 때 입력한 이름"]', "홍길동");
  await page.fill('input[type="tel"]', "010-1234-5678");
  await page.fill('input[type="password"]', "1234");
  await page.getByRole("button", { name: /예약 조회/ }).click();
  await page.waitForTimeout(1300);
}

/* ── 손님 화면 몇 장 ── */
console.log("■ 손님 화면 (폰)");
{
  const page = await phone();
  for (const [name, url] of [["home", "/"], ["rooms", "/rooms/ldc"], ["faq", "/faq"], ["events", "/events"]]) {
    await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await closeNotice(page);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); }
      window.scrollTo(0, 0);
      document.querySelectorAll("img").forEach(i => { i.loading = "eager"; });
    });
    await page.waitForTimeout(900);
    await save(page, name);
  }
  await page.goto(`${BASE}/reserve?theme=ldc`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await closeNotice(page);
  await page.waitForTimeout(900);
  await save(page, "reserve");

  // 챗봇 — 계좌 답변까지
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await closeNotice(page);
  await page.locator(".cw-fab").click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "예약금 입금 계좌" }).click();
  await page.waitForTimeout(900);
  await save(page, "chatbot");
  await page.context().close();
}

/* ── 조회·취소·변경 ── */
console.log("■ 조회 · 취소 · 변경 (폰)");
{
  const page = await phone();
  await page.goto(`${BASE}/reservation`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await closeNotice(page);
  await page.waitForTimeout(600);
  await save(page, "lookup-form");
  await page.context().close();
}
for (const [key, name] of [["unpaid", "lookup-unpaid"], ["mixed", "lookup-cancelled"]]) {
  const page = await phone();
  await lookup(page, CASES[key]);
  await save(page, name);
  await page.context().close();
}
for (const [key, name] of [["full", "cancel-100"], ["part", "cancel-80"], ["none", "cancel-0"]]) {
  const page = await phone();
  await lookup(page, CASES[key]);
  await page.getByRole("button", { name: "예약 취소" }).first().click();
  await page.waitForTimeout(800);
  await save(page, name);
  if (key === "full") {
    const next = page.getByRole("button", { name: /환불 계좌 입력/ }).first();
    if (await next.count()) { await next.click(); await page.waitForTimeout(700); await save(page, "cancel-account"); }
    await page.fill("#rf-bank", "카카오뱅크").catch(() => {});
    await page.fill("#rf-acct", "3333097175706").catch(() => {});
    await page.fill("#rf-holder", "홍길동").catch(() => {});
    await page.getByRole("button", { name: /취소 확정|확정/ }).last().click().catch(() => {});
    await page.waitForTimeout(1300);
    if (await page.locator(".modal", { hasText: "예약 취소 안내" }).count()) await save(page, "cancel-done");
    else console.log("  ⚠ 취소 완료 팝업 못 띄움");
  }
  await page.context().close();
}
{
  const page = await phone();
  await lookup(page, CASES.full);
  const btn = page.getByRole("button", { name: "시간 변경" }).first();
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(1300);
    await save(page, "change-modal");
    const days = page.locator(".modal button.rcal-cell:not(.past):not(.locked):not(.empty):not([disabled])");
    const n = await days.count();
    let picked = false;
    for (let d = 0; d < n && !picked; d++) {
      await days.nth(d).click().catch(() => {});
      await page.waitForTimeout(1000);
      if (await page.locator(".modal button.opt:not([disabled])").count()) {
        await page.locator(".modal button.opt:not([disabled])").first().click(); picked = true;
      }
    }
    if (picked) {
      await page.waitForTimeout(400);
      await page.getByRole("button", { name: "이 시간으로 변경" }).click();
      await page.waitForTimeout(1400);
      if (await page.locator(".modal", { hasText: "예약 시간이 변경되었습니다" }).count()) await save(page, "change-done");
      else console.log("  ⚠ 변경 완료 팝업 못 띄움");
    } else console.log("  ⚠ 고를 수 있는 시간이 없어 변경 완료 팝업 건너뜀");
  }
  await page.context().close();
}

/* ── 예약 접수 직후 예약금 안내창 ── */
console.log("■ 예약금 안내창 (폰)");
{
  const page = await phone();
  await page.route("**/api/reservations", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, id: "fake", deposit: 40000 }) });
  });
  await page.goto(`${BASE}/reserve?theme=ldc`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await closeNotice(page);
  await page.locator("button.rcal-cell:not(.past):not(.locked):not(.empty):not([disabled])").nth(2).click();
  await page.waitForTimeout(900);
  await save(page, "slots");
  await page.locator(".rv-slot:not([disabled]), .slot:not([disabled]), button.time:not([disabled])").first().click().catch(() => {});
  await page.waitForTimeout(500);
  await page.locator('input[type="text"]').first().fill("테스트").catch(() => {});
  await page.locator('input[type="tel"]').first().fill("010-0000-0000").catch(() => {});
  await page.locator('input[type="password"]').first().fill("1234").catch(() => {});
  for (const cb of await page.locator('input[type="checkbox"]').all()) await cb.check().catch(() => {});
  await page.getByRole("button", { name: /예약하기|예약 신청|접수|신청/ }).last().click({ force: true }).catch(() => {});
  await page.waitForTimeout(1600);
  const modal = page.locator(".modal", { hasText: "예약금 입금 안내" });
  if (await modal.count()) {
    await modal.locator('input[type="checkbox"]').check();
    await page.waitForTimeout(400);
    await save(page, "deposit");
  } else console.log("  ⚠ 예약금 안내창 못 띄움");
  await page.context().close();
}

await b.close();
console.log(`\n■ 폰 화면 ${made.length}장 → ${OUT} (m-*.webp)`);
