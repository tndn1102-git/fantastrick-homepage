/* 방화벽 규칙에서 /wp-admin/admin-ajax.php 만 **잠깐** 빼거나 도로 넣는다 (조사용)
 *   node scripts/peek-ajax.mjs open    구멍 열기 (그 주소만 워커까지 오게)
 *   node scripts/peek-ajax.mjs close   원래대로 (반드시 다시 닫을 것)
 *
 * [왜] 방화벽에 막힌 요청은 워커까지 안 와서 **무엇을 물어보는지 알 방법이 없다.**
 *      수집기가 정확히 어떤 값을 달라고 하는지 알아야 맞춰줄 수 있다.
 * ⚠️ 열어도 middleware 가 404 로 돌려보낸다 — 밖에서 보이는 동작은 그대로다.
 *    다만 그동안은 **요청 수(하루 10만)에 잡힌다.** 조사 끝나면 바로 닫을 것.
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
if (!rule) { console.error("규칙을 못 찾았습니다."); process.exit(1); }
let expr = rule.filter.expression;
const has = expr.includes(HOLE.trim());

if (MODE === "open") {
  if (has) { console.log("이미 열려 있습니다."); process.exit(0); }
  expr += HOLE;
} else if (MODE === "close") {
  if (!has) { console.log("이미 닫혀 있습니다."); process.exit(0); }
  expr = expr.replace(HOLE, "");
} else { console.log("현재 규칙:\n  " + expr + "\n\n구멍 " + (has ? "열림" : "닫힘")); process.exit(0); }

await api(`/filters/${rule.filter.id}`, { method: "PUT", body: JSON.stringify({ id: rule.filter.id, expression: expr, paused: false }) });
console.log(MODE === "open" ? "✅ 구멍 열림 — 조사 끝나면 반드시 close 하세요" : "✅ 원래대로 닫음");
