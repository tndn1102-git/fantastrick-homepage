import { chromium } from "playwright";

const OUT = "C:/Users/tndn1/AppData/Local/Temp/claude/D--test3/cb78f26a-833c-4a3c-8181-8b107c2f9b2f/scratchpad";
const BASE = "http://localhost:3457";
const PAGES = [
  ["home", "/"],
  ["about", "/about"],
  ["events", "/events"],
  ["room", "/rooms/ldc"],
  ["reserve", "/reserve"],
];

const b = await chromium.launch({ channel: "chrome" });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

const bad = [];
page.on("response", (r) => {
  if (r.status() >= 400) bad.push(`${r.status()} ${r.url().replace(BASE, "")}`);
});
page.on("pageerror", (e) => bad.push("JS오류: " + String(e).slice(0, 120)));

for (const [name, p] of PAGES) {
  await page.goto(BASE + p, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/shot-${name}.png`, fullPage: false });

  // 화면에 실제로 그려진 <img> 가 제대로 로드됐는지 확인
  const imgs = await page.evaluate(() =>
    [...document.querySelectorAll("img")].map((i) => ({
      src: i.currentSrc || i.src,
      ok: i.complete && i.naturalWidth > 0,
      w: i.naturalWidth,
    })));
  const broken = imgs.filter((i) => !i.ok);
  console.log(`■ ${name.padEnd(8)} 사진 ${imgs.length}개 · 깨진 것 ${broken.length}개`);
  for (const x of broken) console.log("     ✗ " + x.src);
  const opt = imgs.filter((i) => i.src.includes("/_next/image"));
  if (opt.length) console.log("     ⚠ 아직 서버 변환 쓰는 사진 " + opt.length + "개: " + opt[0].src.slice(0, 90));
}

console.log("\n■ 실패한 요청·오류");
console.log(bad.length ? bad.map((x) => "   " + x).join("\n") : "   없음 ✔");

await b.close();
