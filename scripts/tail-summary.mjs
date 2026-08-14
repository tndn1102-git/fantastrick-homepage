// wrangler tail 로 받은 기록을 요약한다 — "무엇이 요청을 많이 먹나" 를 눈으로 보려고.
//   npx wrangler tail fantastrick-homepage --format json > tail.json
//   node scripts/tail-summary.mjs tail.json
//
// tail 출력은 여러 줄로 예쁘게 찍힌 JSON 이 줄줄이 붙어 있어서 한 줄씩 못 읽는다.
// 중괄호 깊이를 세어 객체 단위로 잘라낸다.

import fs from "node:fs";

const txt = fs.readFileSync(process.argv[2] || "tail.json", "utf8");
const objs = [];
let depth = 0, start = -1, inStr = false, esc = false;
for (let i = 0; i < txt.length; i++) {
  const c = txt[i];
  if (inStr) {
    if (esc) esc = false;
    else if (c === "\\") esc = true;
    else if (c === '"') inStr = false;
    continue;
  }
  if (c === '"') { inStr = true; continue; }
  if (c === "{") { if (depth === 0) start = i; depth++; }
  else if (c === "}") { depth--; if (depth === 0 && start >= 0) { objs.push(txt.slice(start, i + 1)); start = -1; } }
}

let n = 0;
const byPath = {}, byUA = {}, byIP = {}, byOutcome = {};
let first = Infinity, last = 0;
for (const o of objs) {
  let j;
  try { j = JSON.parse(o); } catch { continue; }
  const r = j.event?.request;
  if (!r) continue;
  n++;
  first = Math.min(first, j.eventTimestamp); last = Math.max(last, j.eventTimestamp);
  const u = new URL(r.url);
  let p = u.pathname
    .replace(/\/_next\/static\/.*/, "/_next/static/*")
    .replace(/\/_next\/image.*/, "/_next/image")
    .replace(/\/rooms\/.+/, "/rooms/*");
  byPath[p] = (byPath[p] || 0) + 1;
  const ua = (r.headers?.["user-agent"] || "(없음)").slice(0, 58);
  byUA[ua] = (byUA[ua] || 0) + 1;
  const ip = r.headers?.["cf-connecting-ip"] || "-";
  byIP[ip] = (byIP[ip] || 0) + 1;
  byOutcome[j.outcome] = (byOutcome[j.outcome] || 0) + 1;
}

const secs = Math.max(1, Math.round((last - first) / 1000));
const top = (o, k) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, k);
const pct = (v) => ((v / n) * 100).toFixed(1).padStart(5) + "%";

console.log(`■ ${secs}초 동안 워커가 처리한 요청: ${n}건`);
console.log(`   → 이 속도면 하루 약 ${Math.round((n / secs) * 86400).toLocaleString()}건\n`);
console.log("■ 주소별");
top(byPath, 14).forEach(([k, v]) => console.log(`  ${String(v).padStart(4)} ${pct(v)}  ${k.slice(0, 60)}`));
console.log("\n■ 접속 프로그램 (로봇이면 이름에 bot·crawler 가 보인다)");
top(byUA, 8).forEach(([k, v]) => console.log(`  ${String(v).padStart(4)} ${pct(v)}  ${k}`));
console.log("\n■ IP 별 (한 곳이 압도적이면 그게 범인)");
top(byIP, 6).forEach(([k, v]) => console.log(`  ${String(v).padStart(4)} ${pct(v)}  ${k}`));
console.log("\n■ 처리 결과", JSON.stringify(byOutcome));
