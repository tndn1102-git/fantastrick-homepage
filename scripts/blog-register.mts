/* 블로그 주소를 읽어 후기로 저장한다. 사용: npx tsx scripts/blog-register.mts <주소> "<동의 경로>" */
import { readFileSync } from "node:fs";
import { fetchBlogReview } from "../src/lib/blog-review.ts";

const env = readFileSync(".env.local", "utf8");
const g = (k: string) => (env.match(new RegExp("^" + k + "=(.*)$", "m")) || [])[1]?.trim() ?? "";
const URL_ = g("SUPABASE_URL"), KEY = g("SUPABASE_SERVICE_ROLE_KEY");

const url = process.argv[2];
const consent = process.argv[3] || "사장님이 작성자에게 직접 연락해 동의 받음";
const d = await fetchBlogReview(url);
if (!d.ok) { console.log("읽기 실패: " + d.error); process.exit(1); }
if (!d.themeId) { console.log("테마를 못 찾았습니다 — 직접 지정이 필요합니다."); process.exit(1); }

const h = { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json", Prefer: "return=representation" };
const dup = await (await fetch(`${URL_}/rest/v1/reviews?select=id&source_url=eq.${encodeURIComponent(d.url!)}`, { headers: h })).json();
if (Array.isArray(dup) && dup.length) { console.log("이미 등록된 글입니다."); process.exit(0); }

const res = await fetch(`${URL_}/rest/v1/reviews`, {
  method: "POST", headers: h,
  body: JSON.stringify({
    theme_id: d.themeId, theme_name: d.themeName, name: d.author, phone: null, rating: null,
    body: d.excerpt, status: "approved", source: "네이버 블로그",
    source_url: d.url, consent_note: consent, consent_at: new Date().toISOString(),
    // 후기 날짜는 원글이 쓰인 날로 둔다(옮겨 담은 날이 아니라).
    ...(d.postedAt ? { created_at: new Date(d.postedAt + "T12:00:00+09:00").toISOString() } : {}),
  }),
});
const j = await res.json();
console.log(res.ok ? `등록 완료 ✅  ${d.themeName} · ${d.author}` : "등록 실패: " + JSON.stringify(j).slice(0, 300));
