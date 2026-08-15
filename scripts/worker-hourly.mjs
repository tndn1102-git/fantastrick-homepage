// 시간대별 워커 요청량 (읽기 전용)
//   node scripts/worker-hourly.mjs [시간]     기본 12시간
//
// 하루 한도(10만)에 얼마나 다가가는지 "시간당 몇 건" 으로 본다.
// 한도는 UTC 자정(= 한국시간 오전 9시)에 초기화된다.

import { config } from "dotenv";
config({ path: ".env.local" });

const T = process.env.CF_DOMAIN_TOKEN || process.env.CF_API_TOKEN;
const ACCOUNT = "deca447f8b1b4d9917996947dfc14ce2";
const HOURS = Number(process.argv[2] || 12);

const since = new Date(Date.now() - HOURS * 3600e3).toISOString();
const until = new Date().toISOString();

const r = await fetch("https://api.cloudflare.com/client/v4/graphql", {
  method: "POST",
  headers: { Authorization: `Bearer ${T}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    query: `query($acc:String!,$since:Time!,$until:Time!){viewer{accounts(filter:{accountTag:$acc}){
      workersInvocationsAdaptive(limit:10000,filter:{datetime_geq:$since,datetime_leq:$until}){
        sum{ requests errors } dimensions{ scriptName datetimeHour } }}}}`,
    variables: { acc: ACCOUNT, since, until },
  }),
});
const j = await r.json();
if (j.errors) { console.error("조회 실패:", JSON.stringify(j.errors).slice(0, 200)); process.exit(1); }
const rows = j.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive ?? [];

const byHour = new Map();
for (const x of rows) {
  const h = x.dimensions.datetimeHour;
  const cur = byHour.get(h) || { req: 0, err: 0, home: 0 };
  cur.req += x.sum.requests; cur.err += x.sum.errors;
  if (x.dimensions.scriptName === "fantastrick-homepage") cur.home += x.sum.requests;
  byHour.set(h, cur);
}

const kst = (iso) => new Date(new Date(iso).getTime() + 9 * 3600e3).toISOString().slice(11, 16);
const utcDay = new Date().toISOString().slice(0, 10);

console.log(`■ 시간대별 요청 (한국시각 기준 · 한도는 매일 오전 9시 초기화)\n`);
console.log("   한국시각   전체     홈페이지   오류");
let todayTotal = 0;
const keys = [...byHour.keys()].sort();
for (const h of keys) {
  const v = byHour.get(h);
  const isToday = h.slice(0, 10) === utcDay;
  if (isToday) todayTotal += v.req;
  const bar = "█".repeat(Math.min(30, Math.round(v.req / 400)));
  console.log(`   ${kst(h)}  ${String(v.req).padStart(6)}  ${String(v.home).padStart(8)}  ${String(v.err).padStart(4)}  ${bar}`);
}

const lastFull = keys.length >= 2 ? byHour.get(keys[keys.length - 2]) : null;
console.log(`\n■ 오늘(초기화 후) 누적: ${todayTotal.toLocaleString()}건 / 100,000건  (${((todayTotal / 100000) * 100).toFixed(1)}%)`);
if (lastFull) {
  console.log(`■ 직전 1시간: ${lastFull.req.toLocaleString()}건  → 이 속도면 하루 ${(lastFull.req * 24).toLocaleString()}건`);
  console.log(`   ${lastFull.req * 24 > 100000 ? "⚠️ 이대로면 오늘도 한도를 넘긴다" : "✔ 이 속도면 한도 안에 들어온다"}`);
}
