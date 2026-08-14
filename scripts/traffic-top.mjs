// 어떤 주소가 요청을 많이 먹는지 (읽기 전용)
//   node scripts/traffic-top.mjs [시간]     기본 24시간
//
// 워커 요청 10만 건 경고의 원인을 찾으려고 만들었다(2026-08-14).
// 경로·브라우저 종류별로 묶어 "사람인지 로봇인지"를 가른다.

import { config } from "dotenv";
config({ path: ".env.local" });

const T = process.env.CF_DOMAIN_TOKEN || process.env.CF_API_TOKEN;
const HOURS = Number(process.argv[2] || 24);
const since = new Date(Date.now() - HOURS * 3600e3).toISOString();
const until = new Date().toISOString();

const zr = await (await fetch("https://api.cloudflare.com/client/v4/zones?name=fantastrick.co.kr", { headers: { Authorization: `Bearer ${T}` } })).json();
const ZONE = zr.result?.[0]?.id;
if (!ZONE) { console.error("zone 을 못 찾았습니다."); process.exit(1); }

async function gql(query, variables) {
  const r = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${T}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (j.errors) { console.error("조회 실패:", JSON.stringify(j.errors).slice(0, 300)); process.exit(1); }
  return j.data;
}

const V = { zone: ZONE, since, until };

/* ① 경로별 */
const paths = (await gql(`
query($zone:String!,$since:Time!,$until:Time!){viewer{zones(filter:{zoneTag:$zone}){
  httpRequestsAdaptiveGroups(limit:25,orderBy:[count_DESC],
    filter:{datetime_geq:$since,datetime_leq:$until}){
    count dimensions{ clientRequestPath clientRequestHTTPHost }
  }}}}`, V)).viewer.zones[0].httpRequestsAdaptiveGroups;

console.log(`■ 최근 ${HOURS}시간 · 요청 많은 주소 25개\n`);
let total = 0;
paths.forEach((p) => { total += p.count; });
paths.forEach((p) => console.log(`${String(p.count).padStart(7)}  ${p.dimensions.clientRequestHTTPHost}${p.dimensions.clientRequestPath}`.slice(0, 110)));

/* ② 사람 vs 로봇 */
const bots = (await gql(`
query($zone:String!,$since:Time!,$until:Time!){viewer{zones(filter:{zoneTag:$zone}){
  httpRequestsAdaptiveGroups(limit:15,orderBy:[count_DESC],
    filter:{datetime_geq:$since,datetime_leq:$until}){
    count dimensions{ userAgentBrowser clientRequestHTTPHost }
  }}}}`, V)).viewer.zones[0].httpRequestsAdaptiveGroups;
console.log(`\n■ 브라우저 종류별 (로봇이면 이름이 비거나 이상하게 나온다)\n`);
bots.forEach((b) => console.log(`${String(b.count).padStart(7)}  ${b.dimensions.userAgentBrowser || "(알 수 없음/로봇)"}  ← ${b.dimensions.clientRequestHTTPHost}`));

/* ③ 응답 코드별 */
const codes = (await gql(`
query($zone:String!,$since:Time!,$until:Time!){viewer{zones(filter:{zoneTag:$zone}){
  httpRequestsAdaptiveGroups(limit:15,orderBy:[count_DESC],
    filter:{datetime_geq:$since,datetime_leq:$until}){
    count dimensions{ edgeResponseStatus }
  }}}}`, V)).viewer.zones[0].httpRequestsAdaptiveGroups;
console.log(`\n■ 응답 코드별\n`);
codes.forEach((c) => console.log(`${String(c.count).padStart(7)}  HTTP ${c.dimensions.edgeResponseStatus}`));
