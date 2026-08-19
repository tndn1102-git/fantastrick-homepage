/* 방화벽에서 `/wp-admin/admin-ajax.php` 만 통과시키기 (나머지 워드프레스 주소는 계속 차단)
 *
 *   node scripts/waf-ajax.mjs           지금 상태 보기
 *   node scripts/waf-ajax.mjs allow     통과시키기  ← 평소 상태여야 한다
 *   node scripts/waf-ajax.mjs block     도로 막기
 *
 * [왜 이 주소만 열어두나]
 *   예약 모아보기 앱(빠방)의 우리 몫 수집 코드는 옛 워드프레스 예약 플러그인(Booked)의
 *   이 창구만 볼 줄 안다. 우리가 그 모양대로 **진짜 예약 현황**을 답해주고 있다
 *   (src/app/wp-admin/admin-ajax.php/route.ts · src/lib/booked-compat.ts).
 *   방화벽에서 막으면 그 답이 나가지 못한다 — 그래서 여기만 예외로 둔다.
 *
 * ⚠️ 대신 하루 약 5,900건이 요청 수(한도 10만)에 잡힌다. 6% 쯤이다.
 *    한도가 다시 빠듯해지면 block 으로 되돌리는 대신 **유료 전환**을 먼저 검토할 것 —
 *    막으면 빠방 노출이 다시 죽는다.
 * ⚠️ /wp-login·/wp-content 같은 나머지는 그대로 막힌 채다(취약점 탐색 로봇용).
 */
import { config } from "dotenv";
config({ path: "D:/test3/fantastrick-homepage/.env.local" });

const T = process.env.CF_DOMAIN_TOKEN;
const ZONE = "aacd74b8cd7f340dc8135f0ccdffb493";
const MODE = process.argv[2];
const HOLE = ' and not (http.request.uri.path eq "/wp-admin/admin-ajax.php")';

async function api(path, init) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE}${path}`, {
    ...init, headers: { Authorization: `Bearer ${T}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const j = await r.json();
  if (!j.success) throw new Error(`${r.status} ${JSON.stringify(j.errors).slice(0, 300)}`);
  return j.result;
}

const rules = await api("/firewall/rules");
const rule = rules.find((x) => (x.description || "").includes("wp-probe-block") || (x.filter?.expression || "").includes("wp-admin"));
if (!rule) { console.error("워드프레스 차단 규칙을 못 찾았습니다."); process.exit(1); }

let expr = rule.filter.expression;
const allowed = expr.includes(HOLE.trim());

if (MODE === "allow") {
  if (allowed) { console.log("이미 통과 상태입니다."); process.exit(0); }
  expr += HOLE;
} else if (MODE === "block") {
  if (!allowed) { console.log("이미 막힌 상태입니다."); process.exit(0); }
  expr = expr.replace(HOLE, "");
} else {
  console.log(`admin-ajax.php : ${allowed ? "✅ 통과 (정상)" : "⛔ 막힘 — 빠방 노출이 죽습니다"}`);
  console.log("\n현재 규칙:\n  " + expr);
  process.exit(0);
}

await api(`/filters/${rule.filter.id}`, { method: "PUT", body: JSON.stringify({ id: rule.filter.id, expression: expr, paused: false }) });
console.log(MODE === "allow" ? "✅ admin-ajax.php 통과시킴" : "⛔ admin-ajax.php 도로 막음");
