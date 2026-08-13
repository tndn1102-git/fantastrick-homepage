// 메인 페이지 스크롤이 실제로 얼마나 끊기는지 잰다 (1회용 진단)
//   node scripts/scroll-perf.mjs [url]
// 프레임 간격을 전부 모아 "16.7ms 를 크게 넘긴 프레임"을 센다. 사람이 "뚝뚝"이라 느끼는 게 이것.

import { chromium } from "playwright";

const URL_ = process.argv[2] || "https://fantastrick.co.kr/";
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// 느린 PC·폰을 흉내낸다. 개발용 PC 는 빨라서 아무 문제도 안 보인다 —
// 사장님이 느끼는 끊김은 대개 여기서만 재현된다.
const SLOW = Number(process.env.CPU || 1);
if (SLOW > 1) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: SLOW });
}

await page.goto(URL_, { waitUntil: "networkidle" });
await page.waitForTimeout(4500); // 히어로 등장 연출이 끝나기를 기다린다(그 구간은 원래 바쁘다)

// 프레임 간격 수집 시작
await page.evaluate(() => {
  window.__gaps = [];
  let last = performance.now();
  const loop = (t) => { window.__gaps.push(t - last); last = t; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
});

// 진짜 마우스 휠로 굴린다 — window.scrollTo 는 입력 경로를 안 타서 실제와 다르게 매끄럽다.
const height = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
const STEP = 110;
for (let y = 0; y < height; y += STEP) {
  await page.mouse.wheel(0, STEP);
  await page.waitForTimeout(20);
}

const result = await page.evaluate(() => {
  const g = window.__gaps.slice(3).sort((a, b) => a - b);
  const pct = (p) => g[Math.floor(g.length * p)] ?? 0;
  return {
    frames: g.length,
    median: +pct(0.5).toFixed(1),
    p95: +pct(0.95).toFixed(1),
    worst: +Math.max(...g).toFixed(1),
    janky33: g.filter((x) => x > 33).length,   // 두 프레임 이상 놓침 = 눈에 보임
    janky50: g.filter((x) => x > 50).length,   // 확실히 "뚝"
  };
});

console.log(`\n■ ${URL_}`);
console.log(`  프레임 ${result.frames}개 · 중앙값 ${result.median}ms · p95 ${result.p95}ms · 최악 ${result.worst}ms`);
console.log(`  33ms 초과(눈에 보이는 끊김) ${result.janky33}개 · 50ms 초과(확실한 뚝) ${result.janky50}개`);
console.log(`  → 60fps 기준선은 16.7ms. 중앙값이 여기 가까울수록 부드럽다.\n`);

await browser.close();
