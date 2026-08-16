// 예약금 입금 안내 화면 3곳 점검 (읽기 전용 · DB 안 건드림)
//   1) node scripts/check-deposit-ui.mjs        기본 http://localhost:3457
//
// 예약조회는 실제 미입금 예약이 있어야 계좌 칸이 나온다. 진짜 DB 를 건드리지 않으려고
// 조회 요청만 가로채(route intercept) 가짜 예약을 돌려준다. 서버·DB 는 그대로다.

import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:3457";
const OUT = process.env.SHOT_DIR || ".";

const FAKE = {
  ok: true,
  reservations: [
    { id: "test-unpaid", store_id: "store1", theme_id: "ldc", theme_name: "락다운 시티",
      date: "2026-09-20", time: "19:00", people: 4, name: "홍길동",
      deposit: 40000, deposit_paid: false, status: "pending", changed: false },
    { id: "test-paid", store_id: "store1", theme_id: "time", theme_name: "시간의 영속성",
      date: "2026-09-21", time: "20:00", people: 2, name: "홍길동",
      deposit: 20000, deposit_paid: true, status: "confirmed", changed: false },
  ],
};

const b = await chromium.launch({ channel: "chrome" });
const page = await (await b.newContext({ viewport: { width: 430, height: 940 } })).newPage();
const bad = [];
page.on("pageerror", (e) => bad.push("JS오류: " + String(e).slice(0, 140)));

// 공지 팝업(NoticeModal)이 떠 있으면 클릭이 전부 막힌다 — 먼저 닫는다.
/* 공지 팝업은 자료를 받아온 뒤에 뜨므로 페이지 로드 직후엔 아직 없을 수 있다.
   → 잠깐 기다렸다가, 뜨면 닫는다(최대 4초). */
async function closeNotice() {
  for (let i = 0; i < 16; i++) {
    if (await page.locator(".nt-overlay").count()) {
      await page.locator(".nt-modal .close-x").click({ force: true }).catch(() => {});
      await page.waitForTimeout(300);
      if (!(await page.locator(".nt-overlay").count())) return;
    }
    await page.waitForTimeout(250);
  }
}

/* ── ① 예약조회 — 미입금 예약에만 계좌가 나와야 한다 ── */
await page.route("**/api/reservations?*", (r) =>
  r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FAKE) }));

await page.goto(`${BASE}/reservation`, { waitUntil: "networkidle" });
await closeNotice();
await page.fill('input[placeholder="예약 때 입력한 이름"]', "홍길동");
await page.fill('input[type="tel"]', "010-1234-5678");
await page.fill('input[type="password"]', "1234");
await page.getByRole("button", { name: /예약 조회/ }).click();
await page.waitForTimeout(1200);

const boxes = await page.locator(".pay-box").count();
const acctText = await page.locator(".pay-box .pay-acct").first().innerText().catch(() => "");
console.log("■ 예약조회");
console.log(`   입금안내 칸 ${boxes}개  (미입금 1건만 나와야 정상 → ${boxes === 1 ? "✔" : "✗"})`);
console.log("   계좌 표시: " + acctText.replace(/\n/g, " "));
console.log("   금액 표시: " + (await page.locator(".pay-box-amt").first().innerText().catch(() => "없음")));
console.log("   이름 안내: " + (await page.locator(".pay-box-note").first().innerText().catch(() => "없음")));
await page.screenshot({ path: `${OUT}/deposit-lookup.png`, fullPage: true });

/* ── ② 챗봇 — [예약금 입금 계좌] 버튼 ── */
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await closeNotice();
await page.locator(".cw-fab").first().click();
await page.waitForTimeout(500);
await page.getByRole("button", { name: "예약금 입금 계좌" }).click();
await page.waitForTimeout(700);
console.log("\n■ 챗봇");
console.log("   계좌 말풍선: " + (await page.locator(".cw-acct").first().innerText().catch(() => "✗ 안 나옴")).replace(/\n/g, " "));
await page.screenshot({ path: `${OUT}/deposit-chat.png` });

console.log("\n■ JS 오류: " + (bad.length ? bad.join(" / ") : "없음 ✔"));
await b.close();
