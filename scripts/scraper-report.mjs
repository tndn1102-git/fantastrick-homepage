// 외부 수집 프로그램 조사 — 몇 초마다, 하루에 얼마나 긁어가나 (읽기 전용)
//   npx wrangler tail fantastrick-homepage --format json > scrape.json
//   node scripts/scraper-report.mjs scrape.json 300
//
// 두 번째 인자 = 관찰한 시간(초). 하루 환산에 쓴다.

import fs from "node:fs";

const file = process.argv[2] || "scrape.json";
const SECS = Number(process.argv[3] || 300);

const txt = fs.readFileSync(file, "utf8");
const blocks = txt.split(/"eventTimestamp":/).slice(1);

const recs = [];
for (const b of blocks) {
  const ts = Number((b.match(/^\s*(\d+)/) || [])[1]);
  const url = (b.match(/"url": "([^"]+)"/) || [])[1];
  const ip = (b.match(/"cf-connecting-ip": "([^"]+)"/) || [])[1] || "-";
  const ua = (b.match(/"user-agent": "([^"]+)"/) || [])[1] || "";
  if (ts && url) recs.push({ ts, url, ip, ua });
}

/** 사람이 쓰는 브라우저인지 — 진짜 브라우저는 언어·브라우저표식이 늘 붙는다 */
const looksHuman = (b) => /sec-ch-ua|accept-language/.test(b);

const byIp = new Map();
for (const r of recs) {
  const v = byIp.get(r.ip) || { n: 0, ua: r.ua, ts: [], paths: new Map() };
  v.n++; v.ts.push(r.ts);
  const p = new URL(r.url).pathname;
  v.paths.set(p, (v.paths.get(p) || 0) + 1);
  byIp.set(r.ip, v);
}

const perDay = (n) => Math.round((n / SECS) * 86400);
const rows = [...byIp.entries()].sort((a, b) => b[1].n - a[1].n);

console.log(`■ ${SECS}초 관찰 · 전체 ${recs.length}건 → 하루 환산 ${perDay(recs.length).toLocaleString()}건\n`);

let botTotal = 0;
console.log("■ 많이 부르는 곳 순서\n");
for (const [ip, v] of rows.slice(0, 8)) {
  const t = v.ts.sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < t.length; i++) gaps.push((t[i] - t[i - 1]) / 1000);
  const span = (t[t.length - 1] - t[0]) / 1000;

  // 한 번에 몰아치는 묶음(0.5초 이내 연속)을 하나의 "회차"로 센다
  const bursts = [];
  let cur = 1;
  for (const g of gaps) { if (g <= 2) cur++; else { bursts.push(cur); cur = 1; } }
  bursts.push(cur);
  const roundGaps = gaps.filter((g) => g > 2);
  const avgRound = roundGaps.length ? (roundGaps.reduce((a, b) => a + b, 0) / roundGaps.length) : null;

  const topPath = [...v.paths.entries()].sort((a, b) => b[1] - a[1])[0];
  const isSlots = topPath && topPath[0] === "/api/slots";
  if (isSlots && v.n > 20) botTotal += v.n;

  console.log(`▸ ${ip}   ${v.n}건 → 하루 ${perDay(v.n).toLocaleString()}건`);
  console.log(`   주로 부르는 곳 : ${topPath[0]} (${topPath[1]}건)`);
  console.log(`   한 회차에      : ${Math.round(bursts.reduce((a, b) => a + b, 0) / bursts.length)}건씩 · 총 ${bursts.length}회차`);
  console.log(`   회차 간격      : ${avgRound ? Math.round(avgRound) + "초마다" : "관찰 구간에 1회차뿐"}`);
  console.log(`   관찰된 시간폭  : ${Math.round(span)}초`);
  console.log(`   정체           : ${v.ua ? v.ua.slice(0, 62) : "(없음)"}\n`);
}

console.log(`■ 예약칸(/api/slots)만 긁는 곳 합계: 하루 약 ${perDay(botTotal).toLocaleString()}건`);
console.log(`   (전체의 ${((botTotal / recs.length) * 100).toFixed(1)}%)`);
