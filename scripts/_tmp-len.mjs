import { config } from "dotenv";
config({ path: "D:/test3/fantastrick-homepage/.env.local" });
const BASE = "https://fantastrick.co.kr";
const login = await fetch(`${BASE}/api/admin/login`, { method: "POST",
  headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }) });
const cookie = (login.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
for (const [label, url] of [
  ["쿠모 (락다운시티)", "https://blog.naver.com/kumo_escape/224307207955"],
  ["탈출하는개미 (락다운시티)", "https://blog.naver.com/wishgodlife/224374621031"],
]) {
  const r = await fetch(`${BASE}/api/admin/reviews`, { method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ action: "import", url, themeId: "ldc", preview: true }) });
  const j = await r.json();
  const d = j.draft || {};
  console.log(`■ ${label}`);
  console.log(`   원문 전체 길이 : ${d.fullLength ?? "?"}자`);
  console.log(`   지금 발췌 길이 : ${(d.excerpt || "").length}자  (상한 400)`);
  console.log(`   원문 대비      : ${d.fullLength ? Math.round((d.excerpt || "").length / d.fullLength * 100) : "?"}%`);
}
