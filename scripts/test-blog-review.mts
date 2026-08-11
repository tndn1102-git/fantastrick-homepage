import { fetchBlogReview, parseNaverUrl } from "../src/lib/blog-review.ts";

const urls = [
  "https://blog.naver.com/naverofficial/224370383976",
  "blog.naver.com/naverofficial/224370377128",
  "https://blog.naver.com/PostView.naver?blogId=naverofficial&logNo=224370383976",
  "https://example.com/abc",
];
console.log("── 주소 해석 ──");
for (const u of urls) console.log("  " + (parseNaverUrl(u) ? "OK   " : "거절 ") + u.slice(0, 62));

console.log("\n── 실제 글 읽기 ──");
const d = await fetchBlogReview(urls[0]);
if (!d.ok) console.log("  실패: " + d.error);
else {
  console.log("  제목    " + d.title);
  console.log("  작성자  " + d.author);
  console.log("  작성일  " + (d.postedAt ?? "못 찾음"));
  console.log("  테마    " + (d.themeName ?? "없음") + " (" + d.matchedBy + ")");
  console.log("  원문 " + d.fullLength + "자 → 발췌 " + (d.excerpt?.length ?? 0) + "자");
  console.log("  ─ 발췌 앞부분 ─");
  console.log((d.excerpt ?? "").slice(0, 400).split("\n").map((l) => "  | " + l).join("\n"));
}
