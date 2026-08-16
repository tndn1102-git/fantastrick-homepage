/* 발표 자료에 넣을 화면 사진을 찍는다 (읽기 전용)
 *   node scripts/capture-deck-shots.mjs [주소]     기본 https://fantastrick.co.kr
 *
 * ⚠️ 개인정보 보호
 *   관리자 화면에는 진짜 손님 이름·전화번호가 있다. 발표 자료는 남에게 보여줄 수 있으므로
 *   **찍기 직전에 화면 위의 이름·전화번호를 가짜로 바꿔치기**한 뒤 찍는다(mask()).
 *   DB 는 건드리지 않는다 — 화면에 그려진 글자만 바꾼다.
 *
 * ⚠️ 예약 접수·조회는 응답을 가로채 가짜 자료를 쓴다. 진짜 예약이 만들어지지 않는다.
 * ⚠️ 관리자에서는 **탭 이동과 사진 찍기 말고 아무것도 누르지 않는다.**
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

const FAKE_LOOKUP = { ok: true, reservations: [
  { id: "u1", store_id: "gangnam1", theme_id: "ldc", theme_name: "락다운 시티", date: "2026-09-20",
    time: "19:00", people: 4, name: "홍길동", deposit: 40000, deposit_paid: false, status: "pending", changed: false },
  { id: "p1", store_id: "gangnam1", theme_id: "time", theme_name: "시간의 영속성", date: "2026-09-21",
    time: "20:00", people: 2, name: "홍길동", deposit: 20000, deposit_paid: true, status: "confirmed", changed: false },
]};

const b = await chromium.launch({ channel: "chrome" });
const shots = [];

async function save(page, name, opts = {}) {
  const tmp = path.join(OUT, name + ".png");
  await page.screenshot({ path: tmp, ...opts });
  const out = path.join(OUT, name + ".webp");
  const w = opts.__w || 1500;
  await sharp(tmp).resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toFile(out);
  fs.unlinkSync(tmp);
  const kb = Math.round(fs.statSync(out).size / 1024);
  shots.push(`${name} ${kb}KB`);
  console.log(`  ✔ ${name}  ${kb}KB`);
}

async function closeNotice(page) {
  for (let i = 0; i < 14; i++) {
    if (await page.locator(".nt-overlay").count()) {
      await page.locator(".nt-modal .close-x").click({ force: true }).catch(() => {});
      await page.waitForTimeout(250);
      if (!(await page.locator(".nt-overlay").count())) return;
    }
    await page.waitForTimeout(200);
  }
}

/** 화면에 그려진 개인정보를 가린다 (DB 는 안 건드림)
 *
 * ⚠️ 처음엔 "2~4글자 한글이면 이름"으로 바꿨다가 **탭 이름까지 바뀌었다**
 *    (예약→김서연, 설정→이수민). 반대로 "조혜원 · 2명" 처럼 다른 글자와 붙어 있는
 *    진짜 이름은 안 걸려서 그대로 노출됐다. 글자 모양으로 이름을 찾으면 안 된다.
 *    → **이름이 들어가는 자리(.who 등)를 직접 지목해서 흐리게** 하고,
 *      전화번호만 모양으로 찾아 바꾼다(전화번호는 오탐이 없다). */
async function mask(page) {
  await page.evaluate(() => {
    // ① 전화번호·계좌번호는 모양이 확실하므로 글자를 바꾼다
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const jobs = [];
    while (walker.nextNode()) jobs.push(walker.currentNode);
    for (const t of jobs) {
      if (!t.nodeValue || !t.nodeValue.trim()) continue;
      t.nodeValue = t.nodeValue
        .replace(/01[016789][-\s]?\d{3,4}[-\s]?\d{4}/g, "010-1234-5678")
        .replace(/\b\d{4}-?\d{2}-?\d{6,7}\b/g, "0000-00-0000000");
    }

    /* ② 이름이 들어가는 자리를 흐리게. **자리를 하나하나 지목한다** —
       admin/page.tsx 를 훑어 이름이 그려지는 곳을 전부 찾은 목록이다.
       (.who / .s-guest 날짜별 줄 / .rf-who 환불카드 / .refund-warn 경고문) */
    const st = document.createElement("style");
    st.textContent = `.who, .who *, .s-guest, .rf-who, .refund-warn,
      [data-mask]{ filter: blur(4.5px) !important; }`;
    document.head.appendChild(st);

    /* ③ 그래도 놓치는 곳이 있을 수 있어 그물을 하나 더 친다 —
       "이름 · N명" 또는 전화번호를 품은 **가장 안쪽 칸**을 찾아 흐리게.
       (안쪽만 골라야 줄 전체가 뭉개지지 않는다) */
    document.querySelectorAll("b, span, button, td, div").forEach((el) => {
      if (el.children.length > 2) return;                 // 큰 덩어리는 건너뛴다
      const t = (el.textContent || "").trim();
      if (t.length > 40) return;
      if (/^[가-힣]{2,4}\s*·\s*\d+명$/.test(t) || /010-1234-5678/.test(t) ||
          /^[가-힣]{2,4}$/.test(t) && el.tagName === "B") {
        el.setAttribute("data-mask", "");
      }
    });
  });
}

const ONLY = process.argv.includes("--admin-only");

/* ───── 손님 화면 ───── */
if (!ONLY) {
  const ctx = await b.newContext({ viewport: { width: 1500, height: 940 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.route("**/api/reservations?*", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FAKE_LOOKUP) }));

  console.log("■ 손님 화면");
  for (const [name, url, wait] of [
    ["home", "/", 1200],
    ["rooms", "/rooms/ldc", 900],
    ["events", "/events", 900],
    ["faq", "/faq", 700],
    ["reviews", "/reviews", 900],
    ["about", "/about", 900],
  ]) {
    await page.goto(BASE + url, { waitUntil: "networkidle" });
    await closeNotice(page);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); }
      window.scrollTo(0, 0);
      document.querySelectorAll("img").forEach(i => { i.loading = "eager"; });
    });
    await page.waitForTimeout(wait);
    await save(page, name);
  }

  // 예약 캘린더
  await page.goto(`${BASE}/reserve?theme=ldc`, { waitUntil: "networkidle" });
  await closeNotice(page);
  await page.waitForTimeout(900);
  await save(page, "reserve-calendar");

  // 예약조회 + 입금 안내
  await page.goto(`${BASE}/reservation`, { waitUntil: "networkidle" });
  await closeNotice(page);
  await page.fill('input[placeholder="예약 때 입력한 이름"]', "홍길동");
  await page.fill('input[type="tel"]', "010-1234-5678");
  await page.fill('input[type="password"]', "1234");
  await page.getByRole("button", { name: /예약 조회/ }).click();
  await page.waitForTimeout(1400);
  await save(page, "lookup-deposit");

  // 챗봇
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await closeNotice(page);
  await page.locator(".cw-fab").click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "예약금 입금 계좌" }).click();
  await page.waitForTimeout(800);
  await save(page, "chatbot");
  await ctx.close();
}

/* ───── 폰 화면: 예약금 팝업 ───── */
if (!ONLY) {
  const ctx = await b.newContext({ viewport: { width: 430, height: 940 }, isMobile: true, hasTouch: true,
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36" });
  const page = await ctx.newPage();
  await page.route("**/api/reservations", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    await route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ ok: true, id: "fake", deposit: 40000 }) });
  });
  console.log("■ 폰 화면");
  await page.goto(`${BASE}/reserve?theme=ldc`, { waitUntil: "networkidle" });
  await closeNotice(page);
  await page.locator("button.rcal-cell:not(.past):not(.locked):not(.empty):not([disabled])").nth(2).click();
  await page.waitForTimeout(900);
  await save(page, "phone-slots", { __w: 430, fullPage: false });
  await page.locator(".rv-slot:not([disabled]), .slot:not([disabled]), button.time:not([disabled])").first().click().catch(() => {});
  await page.waitForTimeout(500);
  await page.locator('input[type="text"]').first().fill("테스트").catch(() => {});
  await page.locator('input[type="tel"]').first().fill("010-0000-0000").catch(() => {});
  await page.locator('input[type="password"]').first().fill("1234").catch(() => {});
  for (const cb of await page.locator('input[type="checkbox"]').all()) await cb.check().catch(() => {});
  await page.getByRole("button", { name: /예약하기|예약 신청|접수|신청/ }).last().click({ force: true }).catch(() => {});
  await page.waitForTimeout(1500);
  const modal = page.locator(".modal", { hasText: "예약금 입금 안내" });
  if (await modal.count()) {
    await modal.locator('input[type="checkbox"]').check();
    await page.waitForTimeout(400);
    await save(page, "phone-deposit", { __w: 430 });
  } else console.log("  ⚠ 예약금 팝업 못 띄움");
  await ctx.close();
}

/* ───── 관리자 (개인정보 가림) ───── */
{
  const ctx = await b.newContext({ viewport: { width: 1500, height: 980 } });
  const page = await ctx.newPage();
  console.log("■ 관리자 (이름·전화번호는 가짜로 바꿔서 찍음)");
  await page.goto(BASE + "/admin", { waitUntil: "networkidle" });
  await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD || "");
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForTimeout(2500);

  if (await page.locator('input[type="password"]').count()) {
    console.log("  ⚠ 로그인 실패 — 관리자 사진은 건너뜁니다");
  } else {
    /* ⚠️ 관리자 탭은 <button> 이 아니라 `.subtab a` 다. 게다가 알림 숫자 배지가 붙어 있어
       이름 완전일치로는 안 잡힌다 — 4장이 전부 같은 탭으로 찍힌 적이 있다(2026-08-16).
       탭이 실제로 바뀌었는지 `.on` 으로 확인하고 넘어간다. */
    for (const [name, tab] of [["admin-res", "예약"], ["admin-money", "입금·환불"], ["admin-talk", "알림톡"], ["admin-set", "설정"]]) {
      const link = page.locator(".subtab a").filter({ hasText: tab }).first();
      await link.click();
      await page.waitForTimeout(1600);
      const active = (await page.locator(".subtab a.on").innerText().catch(() => "")).replace(/\d+/g, "").trim();
      if (!active.includes(tab.slice(0, 2))) console.log(`  ⚠ ${tab} 탭으로 안 바뀜 (지금 ${active})`);
      await mask(page);
      await page.waitForTimeout(200);
      await save(page, name);
    }
  }
  await ctx.close();
}

await b.close();
console.log(`\n■ 찍은 사진 ${shots.length}장 → ${OUT}`);
