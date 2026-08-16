/* 옛 워드프레스 주소를 **관문(방화벽)에서** 끊는다
 *   node scripts/waf-block-wp.mjs            지금 걸린 규칙 보기
 *   node scripts/waf-block-wp.mjs --apply    규칙 걸기(이미 있으면 안 만든다)
 *
 * [왜]
 *   밖에서 /wp-admin/admin-ajax.php 를 23초마다 두드린다(하루 약 4,200번, 전부 404).
 *   middleware.ts 가 404 로 끊고 있지만 그건 **워커가 깨어난 뒤**라 요청 수는 그대로 든다.
 *   방화벽은 워커보다 앞이라, 여기서 끊으면 **요청 수에 아예 안 잡힌다.**
 *   (Workers 문서: "워커에 도달한 요청만 한도에 잡힌다")
 *
 * [왜 옛 API 를 쓰나]
 *   새 Rulesets API 는 토큰에 **Zone WAF** 권한을 따로 요구한다. 지금 토큰엔 없다.
 *   지금 있는 **Firewall Services:Edit** 로는 이 옛 방화벽 API 가 된다. 동작은 같다
 *   (둘 다 워커 앞에서 끊는다). 나중에 Zone WAF 권한이 생기면 새 API 로 옮겨도 된다.
 *
 * ⚠️ 우리 새 홈페이지에는 워드프레스 주소가 하나도 없다(next.config·middleware 확인).
 *    그래서 이 주소들을 막아도 손님이 볼 화면은 아무것도 안 사라진다.
 *    ⛔ 예약칸을 긁어가는 수집기(/api/slots)는 **이 규칙과 무관하다 — 그대로 다 받아간다.**
 */
import { config } from "dotenv";
config({ path: "D:/test3/fantastrick-homepage/.env.local" });

const T = process.env.CF_DOMAIN_TOKEN;
const ZONE = "aacd74b8cd7f340dc8135f0ccdffb493";
const APPLY = process.argv.includes("--apply");
const TAG = "wp-probe-block";

// middleware.ts 의 WP_PROBE 와 같은 목록으로 맞춘다(둘이 어긋나면 헷갈린다).
const PATHS = ["/wp-admin", "/wp-login", "/wp-content", "/wp-includes", "/wp-json", "/wordpress"];
const EXPR = "(" + PATHS.map((p) => `starts_with(http.request.uri.path, "${p}")`).join(" or ")
  + ' or http.request.uri.path eq "/xmlrpc.php")';

async function api(path, init) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE}${path}`, {
    ...init, headers: { Authorization: `Bearer ${T}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const j = await r.json();
  if (!j.success) throw new Error(`${r.status} ${JSON.stringify(j.errors).slice(0, 300)}`);
  return j.result;
}

const existing = await api("/firewall/rules");
console.log(`■ 지금 걸린 방화벽 규칙 ${existing.length}개`);
for (const r of existing) {
  console.log(`   [${r.action}] ${r.description || "(설명없음)"}${r.paused ? " · 꺼짐" : ""}`);
  console.log(`      ${r.filter?.expression?.slice(0, 120)}`);
}

const already = existing.find((r) => (r.description || "").includes(TAG));

if (already) {
  console.log(`\n✔ 이미 걸려 있습니다 (${TAG}). 새로 만들지 않습니다.`);
} else if (!APPLY) {
  console.log("\n■ 걸 규칙 (미리보기 — 실제로 걸려면 --apply)");
  console.log("   동작: 차단(block)");
  console.log("   조건: " + EXPR);
} else {
  const made = await api("/firewall/rules", {
    method: "POST",
    body: JSON.stringify([{
      action: "block",
      description: `${TAG} — 옛 워드프레스 주소 차단(워커 요청 절감, 2026-08-16)`,
      filter: { expression: EXPR, paused: false, description: `${TAG} filter` },
    }]),
  });
  console.log("\n✔ 규칙을 걸었습니다.");
  for (const r of made) console.log(`   id=${r.id} [${r.action}] ${r.description}`);
}
