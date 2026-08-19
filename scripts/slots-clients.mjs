// /api/slots 를 누가 얼마나 부르는지 (읽기 전용)
//   node scripts/slots-clients.mjs [시간]   기본 23시간 (클라우드플레어가 1일 초과 조회를 거부함)
import { config } from "dotenv";
config({ path: ".env.local" });
const T = process.env.CF_DOMAIN_TOKEN || process.env.CF_API_TOKEN;
const HOURS = Number(process.argv[2] || 23);
const since = new Date(Date.now() - HOURS * 3600e3).toISOString();
const until = new Date().toISOString();
const zr = await (await fetch("https://api.cloudflare.com/client/v4/zones?name=fantastrick.co.kr", { headers: { Authorization: `Bearer ${T}` } })).json();
const ZONE = zr.result?.[0]?.id;
const P = process.argv[3] || "/api/slots";
const q = `query($zone:String!,$since:Time!,$until:Time!){viewer{zones(filter:{zoneTag:$zone}){
  httpRequestsAdaptiveGroups(limit:60,filter:{datetime_geq:$since,datetime_leq:$until,clientRequestPath:"${P}"},orderBy:[count_DESC]){
    count dimensions{clientIP cacheStatus edgeResponseStatus}}}}}`;
const r = await fetch("https://api.cloudflare.com/client/v4/graphql", {
  method: "POST", headers: { Authorization: `Bearer ${T}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: q, variables: { zone: ZONE, since, until } }),
});
const j = await r.json();
if (j.errors) { console.error(JSON.stringify(j.errors).slice(0, 400)); process.exit(1); }
const rows = j.data.viewer.zones[0].httpRequestsAdaptiveGroups;
const byIp = {}, byCache = {};
for (const x of rows) {
  byIp[x.dimensions.clientIP] = (byIp[x.dimensions.clientIP] || 0) + x.count;
  byCache[x.dimensions.cacheStatus] = (byCache[x.dimensions.cacheStatus] || 0) + x.count;
}
console.log(`■ 최근 ${HOURS}시간 ${P} — 부른 곳 (상위)`);
Object.entries(byIp).sort((a, b) => b[1] - a[1]).slice(0, 12)
  .forEach(([ip, n]) => console.log(`   ${String(n).padStart(6)}회  ${ip}`));
console.log(`\n■ 캐시 처리 여부 (hit = 우리 서버가 안 깨어남)`);
Object.entries(byCache).sort((a, b) => b[1] - a[1])
  .forEach(([k, n]) => console.log(`   ${String(n).padStart(6)}회  ${k}`));
