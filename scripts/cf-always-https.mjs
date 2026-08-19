/* 클라우드플레어 "항상 HTTPS 사용" 켜기/끄기
 *   node scripts/cf-always-https.mjs        지금 상태
 *   node scripts/cf-always-https.mjs off    끄기  ← 지금은 이 상태여야 한다
 *   node scripts/cf-always-https.mjs on     되돌리기
 *
 * [왜 껐나] 이게 http 요청을 301 로 https 에 넘기는데, 301 을 만난 프로그램은
 *   POST 를 GET 으로 바꾸고 본문을 버린다. 빠방 수집기가 http 로 POST 를 보내서
 *   우리에겐 빈 GET 만 도착하고 있었다(2026-08-19 원인 규명).
 *   대신 src/middleware.ts 가 같은 일을 하되 **창구(admin-ajax)만 예외**로 둔다.
 * ⚠️ 되돌리려면 middleware 의 http 처리도 같이 손봐야 한다 — 안 그러면 수집이 다시 죽는다.
 * ⚠️ HSTS 는 꺼져 있어야 이 방식이 성립한다(켜지면 브라우저가 강제로 https 로 올린다).
 */
import { config } from "dotenv";
config({ path: "D:/test3/fantastrick-homepage/.env.local" });
const T = process.env.CF_DOMAIN_TOKEN, Z = "aacd74b8cd7f340dc8135f0ccdffb493";
const M = process.argv[2];
const url = `https://api.cloudflare.com/client/v4/zones/${Z}/settings/always_use_https`;
const H = { Authorization: `Bearer ${T}`, "Content-Type": "application/json" };
if (M !== "on" && M !== "off") {
  const j = await (await fetch(url, { headers: H })).json();
  console.log("항상 HTTPS 사용 = " + (j.success ? j.result.value : JSON.stringify(j.errors).slice(0, 200)));
  process.exit(0);
}
const j = await (await fetch(url, { method: "PATCH", headers: H, body: JSON.stringify({ value: M }) })).json();
console.log(j.success ? `✅ 항상 HTTPS 사용 = ${j.result.value}` : "실패: " + JSON.stringify(j.errors).slice(0, 300));
