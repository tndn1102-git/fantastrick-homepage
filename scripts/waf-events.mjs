// 방화벽이 막은 요청이 누구였는지 (읽기 전용)
//   node scripts/waf-events.mjs [시간]
// ⚠️ 방화벽에 막힌 요청은 워커까지 안 오므로 wrangler tail 에는 절대 안 보인다. 여기서만 보인다.
import { config } from "dotenv";
config({ path: ".env.local" });
const T = process.env.CF_DOMAIN_TOKEN || process.env.CF_API_TOKEN;
const HOURS = Number(process.argv[2] || 23);
const since = new Date(Date.now() - HOURS * 3600e3).toISOString();
const until = new Date().toISOString();
const zr = await (await fetch("https://api.cloudflare.com/client/v4/zones?name=fantastrick.co.kr", { headers: { Authorization: `Bearer ${T}` } })).json();
const ZONE = zr.result?.[0]?.id;
const q = `query($zone:String!,$since:Time!,$until:Time!){viewer{zones(filter:{zoneTag:$zone}){
  firewallEventsAdaptive(limit:200,filter:{datetime_geq:$since,datetime_leq:$until},orderBy:[datetime_DESC]){
    datetime action clientIP userAgent clientRequestPath clientRequestQuery ruleId source}}}}`;
const r = await fetch("https://api.cloudflare.com/client/v4/graphql", {
  method: "POST", headers: { Authorization: `Bearer ${T}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: q, variables: { zone: ZONE, since, until } }),
});
const j = await r.json();
if (j.errors) { console.error(JSON.stringify(j.errors).slice(0, 500)); process.exit(1); }
const ev = j.data.viewer.zones[0].firewallEventsAdaptive;
console.log(`■ 최근 ${HOURS}시간 방화벽 기록 ${ev.length}건 (최대 200)`);
const grp = {};
for (const e of ev) {
  const k = `${e.action} | ${e.clientIP} | ${e.clientRequestPath} | ${(e.userAgent || "").slice(0, 50)}`;
  (grp[k] = grp[k] || { n: 0, q: new Set() }).n++;
  if (e.clientRequestQuery) grp[k].q.add(e.clientRequestQuery.slice(0, 90));
}
for (const [k, v] of Object.entries(grp).sort((a, b) => b[1].n - a[1].n).slice(0, 12)) {
  console.log(`\n   ${String(v.n).padStart(4)}회  ${k}`);
  [...v.q].slice(0, 3).forEach((x) => console.log(`          물어본 내용: ${x}`));
}
