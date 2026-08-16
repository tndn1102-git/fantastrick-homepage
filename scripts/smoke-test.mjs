/* 전체 점검 (읽기 전용 · 진짜 DB 는 안 건드린다)
 *
 *   npx next build && npx next start -p 3457
 *   node scripts/smoke-test.mjs [주소]        기본 http://localhost:3457
 *
 * 무엇을 보나:
 *   ① 모든 페이지 — 깨진 사진 · 실패한 요청 · JS 오류
 *   ② 사진이 정말 "정적 파일"로 나가는가 (/_next/image 요청이 0건이어야 한다)
 *   ③ 예약조회 — 미입금 예약에만 입금 안내가 뜨는가 (조회 응답만 가짜로 끼움)
 *   ④ 챗봇 — 예약금 입금 계좌 답변 (버튼 + 자유입력)
 *   ⑤ 예약금 팝업 — 체크 전 닫기 잠금 · 뒤로가기 차단 (접수 POST 를 가로채 DB 보호)
 *   ⑥ 폰 화면에서 토스 송금 버튼이 나오는가
 *
 * ⚠️ 공지 팝업(.nt-overlay)이 떠 있으면 모든 클릭이 막힌다 → 매번 먼저 닫는다.
 * ⚠️ next start 를 껐는데 포트가 안 풀리면 옛 빌드를 검사하게 된다. 포트 확인할 것.
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:3457";
const SHOTS = process.env.SHOT_DIR || null;

const PAGES = ["/", "/about", "/events", "/faq", "/reviews", "/business", "/business/collab",
  "/reserve", "/reservation", "/rooms/firstfoundbride", "/rooms/bookofduat", "/rooms/ldc", "/rooms/time"];

const FAKE_LOOKUP = {
  ok: true,
  reservations: [
    { id: "u1", store_id: "gangnam1", theme_id: "ldc", theme_name: "락다운 시티", date: "2026-09-20",
      time: "19:00", people: 4, name: "홍길동", deposit: 40000, deposit_paid: false, status: "pending", changed: false },
    { id: "p1", store_id: "gangnam1", theme_id: "time", theme_name: "시간의 영속성", date: "2026-09-21",
      time: "20:00", people: 2, name: "홍길동", deposit: 20000, deposit_paid: true, status: "confirmed", changed: false },
    { id: "c1", store_id: "gangnam1", theme_id: "bookofduat", theme_name: "사자의 서", date: "2026-09-22",
      time: "18:00", people: 3, name: "홍길동", deposit: 30000, deposit_paid: false, status: "cancelled", changed: false },
  ],
};

const results = [];
const ok = (name, pass, detail = "") => results.push({ name, pass, detail });

const browser = await chromium.launch({ channel: "chrome" });

async function newPage(mobile = false) {
  const ctx = await browser.newContext(mobile
    ? { viewport: { width: 412, height: 900 }, isMobile: true, hasTouch: true,
        userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36" }
    : { viewport: { width: 1280, height: 900 } });
  return ctx.newPage();
}

async function closeNotice(page) {
  for (let i = 0; i < 14; i++) {
    if (await page.locator(".nt-overlay").count()) {
      await page.locator(".nt-modal .close-x").click({ force: true }).catch(() => {});
      await page.waitForTimeout(250);
      if (!(await page.locator(".nt-overlay").count())) return;
    }
    await page.waitForTimeout(220);
  }
}

/* ───────── ①② 전 페이지 + 사진 ───────── */
{
  const page = await newPage();
  const failed = [], jsErr = [], optimized = [];
  page.on("response", (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url().replace(BASE, "")}`); });
  page.on("pageerror", (e) => jsErr.push(String(e).slice(0, 100)));
  page.on("request", (r) => { if (r.url().includes("/_next/image")) optimized.push(r.url()); });

  let brokenTotal = 0, imgTotal = 0;
  const perPage = [];
  for (const p of PAGES) {
    await page.goto(BASE + p, { waitUntil: "networkidle", timeout: 45000 });
    await closeNotice(page);
    /* 게으른 사진(loading=lazy)까지 확실히 불러온다.
       ⚠️ 스크롤만 하고 바로 재면 "아직 받는 중"인 사진이 깨진 걸로 잡힌다(실제로 겪음).
          스크롤 → 게으름 해제 → **전부 끝날 때까지 기다린 뒤** 잰다. */
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 110)); }
      window.scrollTo(0, 0);
      document.querySelectorAll("img").forEach((i) => { i.loading = "eager"; });
      const pending = [...document.querySelectorAll("img")].filter((i) => !i.complete);
      await Promise.race([
        Promise.all(pending.map((i) => new Promise((res) => {
          i.addEventListener("load", res, { once: true });
          i.addEventListener("error", res, { once: true });
        }))),
        new Promise((res) => setTimeout(res, 10000)),
      ]);
    });
    await page.waitForTimeout(500);
    const imgs = await page.evaluate(() => [...document.querySelectorAll("img")]
      .filter((i) => i.getClientRects().length || i.complete)
      .map((i) => ({ src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0 })));
    const broken = imgs.filter((i) => !i.ok);
    imgTotal += imgs.length; brokenTotal += broken.length;
    perPage.push(`${p} (사진 ${imgs.length}${broken.length ? ` · 깨짐 ${broken.length}` : ""})`);
    if (broken.length) broken.forEach((b) => failed.push("깨진사진 " + b.src.replace(BASE, "")));
  }
  ok("모든 페이지 열림 (13쪽)", true, perPage.join(", "));
  ok("깨진 사진 없음", brokenTotal === 0, `사진 ${imgTotal}개 중 깨짐 ${brokenTotal}개`);
  ok("실패한 요청 없음", failed.length === 0, failed.slice(0, 5).join(" / ") || "0건");
  ok("JS 오류 없음", jsErr.length === 0, jsErr.slice(0, 3).join(" / ") || "0건");
  ok("사진이 서버를 안 깨움 (/_next/image 0건)", optimized.length === 0,
    optimized.length ? `⚠ ${optimized.length}건: ${optimized[0]}` : "0건 — 전부 정적 파일");
  await page.context().close();
}

/* ───────── 사진 실제 용량 ───────── */
{
  const page = await newPage();
  const files = ["poster-bride", "poster-time", "poster-duat", "poster-ldc",
    "event-birthday", "review-event", "stores-map", "mascot-fanta-v4", "mascot-tricky-v4"];
  let worst = 0, worstName = "", allOk = true;
  for (const f of files) {
    const r = await page.request.get(`${BASE}/images/${f}.webp`);
    const kb = Math.round((await r.body()).length / 1024);
    if (r.status() !== 200) allOk = false;
    if (kb > worst) { worst = kb; worstName = f; }
  }
  ok("줄인 사진 9장 전부 정상 응답", allOk, `가장 큰 것 ${worstName} ${worst}KB (전부 200KB 이하 목표)`);
  await page.context().close();
}

/* ───────── ③ 예약조회 ───────── */
{
  const page = await newPage();
  await page.route("**/api/reservations?*", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FAKE_LOOKUP) }));
  await page.goto(`${BASE}/reservation`, { waitUntil: "networkidle" });
  await closeNotice(page);
  await page.fill('input[placeholder="예약 때 입력한 이름"]', "홍길동");
  await page.fill('input[type="tel"]', "010-1234-5678");
  await page.fill('input[type="password"]', "1234");
  await page.getByRole("button", { name: /예약 조회/ }).click();
  await page.waitForTimeout(1200);

  const boxes = await page.locator(".pay-box").count();
  ok("예약조회 — 미입금 1건에만 입금 안내", boxes === 1, `예약 3건(미입금·결제완료·취소) 중 ${boxes}칸`);

  const acct = (await page.locator(".pay-box .pay-acct").innerText().catch(() => "")).replace(/\s+/g, " ");
  ok("계좌가 맞게 나옴", acct.includes("카카오뱅크") && acct.includes("3333-09-7175706") && acct.includes("승현수"), acct);

  const amt = await page.locator(".pay-box-amt").innerText().catch(() => "");
  ok("금액이 그 예약의 예약금", amt.includes("40,000"), amt);

  const note = await page.locator(".pay-box-note").innerText().catch(() => "");
  ok("입금자명 안내에 예약자 이름", note.includes("홍길동"), note);

  // 카드 머리글: 테마명과 상태가 겹치지 않아야 한다(전엔 "락다운 시티확정 대기"로 붙었음)
  const gap = await page.evaluate(() => {
    const h = document.querySelector(".rev-list .rev-h");
    if (!h) return null;
    const a = h.querySelector(".who")?.getBoundingClientRect();
    const b = h.querySelector(".date")?.getBoundingClientRect();
    return a && b ? Math.round(b.left - a.right) : null;
  });
  ok("카드 머리글 — 테마명·상태 사이 간격", gap !== null && gap >= 6, `${gap}px`);

  if (SHOTS) await page.screenshot({ path: `${SHOTS}/t-lookup.png`, fullPage: true });
  await page.context().close();
}

/* ───────── ④ 챗봇 ───────── */
{
  const page = await newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await closeNotice(page);
  await page.locator(".cw-fab").click();
  await page.waitForTimeout(400);

  await page.getByRole("button", { name: "예약금 입금 계좌" }).click();
  await page.waitForTimeout(600);
  const bubble = (await page.locator(".cw-acct").innerText().catch(() => "")).replace(/\s+/g, " ");
  ok("챗봇 버튼 — 계좌 답변", bubble.includes("3333-09-7175706") && bubble.includes("승현수"), bubble);

  // 자유 입력도 같은 답으로 가는가
  await page.fill(".cw-input input", "예약금 어디로 입금해요?");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(700);
  ok("챗봇 자유입력 — '입금' 이 계좌 답변으로", (await page.locator(".cw-acct").count()) >= 2,
    `계좌 말풍선 ${await page.locator(".cw-acct").count()}개`);

  // "환불"은 계좌가 아니라 환불 규정으로 가야 한다
  await page.fill(".cw-input input", "환불 규정 알려줘");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(700);
  const last = await page.locator(".cw-msg.bot").last().innerText();
  ok("챗봇 — '환불'은 환불 규정으로", !last.includes("3333-09"), last.slice(0, 40).replace(/\n/g, " ") + "…");

  if (SHOTS) await page.screenshot({ path: `${SHOTS}/t-chat.png` });
  await page.context().close();
}

/* ───────── ⑤⑥ 예약금 팝업 (폰 화면) ───────── */
{
  const page = await newPage(true);
  await page.route("**/api/reservations", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    await route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ ok: true, id: "fake", deposit: 40000 }) });
  });
  await page.goto(`${BASE}/reserve?theme=ldc`, { waitUntil: "networkidle" });
  await closeNotice(page);
  await page.locator("button.rcal-cell:not(.past):not(.locked):not(.empty):not([disabled])").nth(2).click();
  await page.waitForTimeout(900);
  await page.locator(".rv-slot:not([disabled]), .slot:not([disabled]), button.time:not([disabled])").first().click().catch(() => {});
  await page.waitForTimeout(600);
  await page.locator('input[type="text"]').first().fill("테스트").catch(() => {});
  await page.locator('input[type="tel"]').first().fill("010-0000-0000").catch(() => {});
  await page.locator('input[type="password"]').first().fill("1234").catch(() => {});
  for (const cb of await page.locator('input[type="checkbox"]').all()) await cb.check().catch(() => {});
  await page.getByRole("button", { name: /예약하기|예약 신청|접수|신청/ }).last().click({ force: true }).catch(() => {});
  await page.waitForTimeout(1500);

  const modal = page.locator(".modal", { hasText: "예약금 입금 안내" });
  if (!(await modal.count())) {
    ok("예약금 팝업 뜸", false, "폼 검증에 막혀 팝업을 못 띄웠습니다");
  } else {
    ok("예약금 팝업 뜸", true, "DB 에는 안 들어감(POST 가로챔)");
    const closeBtn = modal.getByRole("button", { name: "닫기" });
    ok("체크 전 — 닫기 잠김", await closeBtn.isDisabled(), "");
    ok("체크 전 — 송금 버튼 숨김", (await modal.locator(".pay-actions").count()) === 0, "");

    const before = page.url();
    await page.goBack().catch(() => {});
    await page.waitForTimeout(900);
    ok("체크 전 — 뒤로가기 막힘",
      (await page.locator(".modal", { hasText: "예약금 입금 안내" }).count()) > 0 && page.url() === before,
      page.url().replace(BASE, ""));

    await modal.locator('input[type="checkbox"]').check();
    await page.waitForTimeout(400);
    ok("체크 후 — 닫기 열림", !(await closeBtn.isDisabled()), "");
    ok("체크 후 — 폰이라 [토스로 바로 송금] 나옴", (await modal.locator(".btn.pay-toss").count()) === 1,
      (await modal.locator(".pay-actions").innerText()).replace(/\n/g, " / "));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/t-popup.png`, fullPage: true });

    await closeBtn.click();
    await page.waitForTimeout(400);
    ok("체크 후 — 닫힘", (await page.locator(".modal", { hasText: "예약금 입금 안내" }).count()) === 0, "");
  }
  await page.context().close();
}

await browser.close();

/* ───────── 결과 ───────── */
const pass = results.filter((r) => r.pass).length;
console.log("\n══════════ 점검 결과 ══════════\n");
for (const r of results) console.log(`${r.pass ? "✔" : "✗"} ${r.name}${r.detail ? "\n     " + r.detail : ""}`);
console.log(`\n${pass}/${results.length} 통과` + (pass === results.length ? "  — 전부 정상 ✅" : "  — ⚠️ 실패 있음"));
process.exit(pass === results.length ? 0 : 1);
