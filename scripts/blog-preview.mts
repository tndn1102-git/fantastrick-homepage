/* 블로그 주소 하나를 읽어 "무엇이 등록될지" 미리 보여준다. 저장은 하지 않는다.
   사용: npx tsx scripts/blog-preview.mts <주소> */
import { fetchBlogReview } from "../src/lib/blog-review.ts";

const url = process.argv[2];
if (!url) { console.log("주소를 넣어주세요."); process.exit(1); }

const d = await fetchBlogReview(url);
if (!d.ok) { console.log("읽기 실패: " + d.error); process.exit(1); }

console.log("제목    " + d.title);
console.log("작성자  " + d.author);
console.log("작성일  " + (d.postedAt ?? "못 찾음"));
console.log("테마    " + (d.themeName ?? "❌ 못 찾음") + "   (" + d.matchedBy + ")");
console.log("원문 " + d.fullLength + "자 → 발췌 " + (d.excerpt?.length ?? 0) + "자");
console.log("링크    " + d.url);
console.log("\n─── 실릴 내용 ───");
console.log(d.excerpt);
