// 클라우드플레어 워커 요청량 조회 — "하루 10만 건 한도" 경고 원인 찾기 (읽기 전용)
//   node scripts/worker-usage.mjs [일수]      기본 3일
//
// 무료 요금제는 하루 100,000 요청이 한도다(UTC 자정 초기화).
// 어느 워커가 얼마나 쓰는지 봐야 원인을 좁힐 수 있다.

import { config } from "dotenv";
config({ path: ".env.local" });

const T = process.env.CF_DOMAIN_TOKEN || process.env.CF_API_TOKEN;
const ACCOUNT = "deca447f8b1b4d9917996947dfc14ce2";
const DAYS = Number(process.argv[2] || 3);

const since = new Date(Date.now() - DAYS * 86400e3).toISOString();
const until = new Date().toISOString();

const q = `
query($acc:String!,$since:Time!,$until:Time!){
  viewer{
    accounts(filter:{accountTag:$acc}){
      workersInvocationsAdaptive(
        limit:10000,
        filter:{datetime_geq:$since, datetime_leq:$until}
      ){
        sum{ requests errors subrequests }
        dimensions{ scriptName date }
      }
    }
  }
}`;

const r = await fetch("https://api.cloudflare.com/client/v4/graphql", {
  method: "POST",
  headers: { Authorization: `Bearer ${T}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: q, variables: { acc: ACCOUNT, since, until } }),
});
const j = await r.json();
if (j.errors) { console.error("조회 실패:", JSON.stringify(j.errors).slice(0, 300)); process.exit(1); }

const rows = j.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive ?? [];
if (!rows.length) { console.log("자료 없음 (토큰에 Analytics 권한이 없을 수 있습니다)"); process.exit(0); }

const byDay = new Map();
for (const x of rows) {
  const d = x.dimensions.date, s = x.dimensions.scriptName;
  const m = byDay.get(d) || new Map();
  const cur = m.get(s) || { requests: 0, errors: 0, subrequests: 0 };
  cur.requests += x.sum.requests; cur.errors += x.sum.errors; cur.subrequests += x.sum.subrequests;
  m.set(s, cur); byDay.set(d, m);
}

for (const d of [...byDay.keys()].sort()) {
  const m = byDay.get(d);
  const total = [...m.values()].reduce((a, b) => a + b.requests, 0);
  console.log(`\n■ ${d} (UTC)  합계 ${total.toLocaleString()}건  ${total >= 90000 ? "⚠️ 한도 10만 근접" : ""}`);
  [...m.entries()].sort((a, b) => b[1].requests - a[1].requests).forEach(([s, v]) =>
    console.log(`   ${String(s).padEnd(28)} ${String(v.requests).padStart(8)}건  오류 ${v.errors}  바깥호출 ${v.subrequests}`));
}
