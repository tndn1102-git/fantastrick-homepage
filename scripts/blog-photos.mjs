/* 블로그 후기에 쓸 사진 후보 내려받기 (읽기 전용)
 *
 *   node scripts/blog-photos.mjs <블로그주소> [저장폴더]
 *   예) node scripts/blog-photos.mjs https://blog.naver.com/kumo_escape/224307207955
 *
 * 후보를 한 폴더에 받고, 한눈에 고를 수 있게 **붙임장(_contact.jpg)** 도 만든다.
 * 고르는 규칙은 CLAUDE.md 8장과 src/lib/review-photos.ts 주석에 있다.
 *   ⚠️ 손님 단체사진은 쓰지 않는다(초상권). 블로거 캐릭터도 그분 저작물이라 안 된다.
 *
 * [네이버 블로그의 함정 두 가지]
 *   ① 주소를 그대로 부르면 본문이 없다 — 껍데기만 오고 사진은 iframe 안에 있다.
 *      → m.blog.naver.com(모바일) 주소로 바꿔 부른다.
 *   ② 같은 사진이 ?type= 옵션만 다르게 여러 번 나오는데 **그중 일부는 404** 다.
 *      → 경로별로 묶어 두고 200 이 나올 때까지 옵션을 바꿔가며 시도한다.
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const input = process.argv[2];
if (!input) {
  console.log("쓰는 법: node scripts/blog-photos.mjs <블로그주소> [저장폴더]");
  process.exit(1);
}
const OUT = process.argv[3] || "blog-photos-out";
fs.mkdirSync(OUT, { recursive: true });

// 모바일 주소로 바꾼다 (본문이 여기 들어 있다)
const url = input.replace("blog.naver.com", "m.blog.naver.com");

const html = await (await fetch(url, {
  headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15" },
})).text();

const re = /https?:\/\/[^"'\s]*?(?:postfiles|mblogthumb-phinf|blogfiles)[^"'\s]*?\.(?:jpg|jpeg|png)[^"'\s]*/gi;
const groups = new Map();
for (const m of html.matchAll(re)) {
  const key = m[0].split("?")[0];
  if (!groups.has(key)) groups.set(key, []);
  const arr = groups.get(key);
  if (!arr.includes(m[0])) arr.push(m[0]);
}

console.log(`■ 본문 사진 ${groups.size}장 (같은 사진의 다른 옵션은 묶음)`);
const saved = [];
let i = 0;
for (const [key, variants] of groups) {
  i++;
  for (const u of [...variants, key + "?type=w966", key]) {
    try {
      const r = await fetch(u);
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      const md = await sharp(buf).metadata();
      if ((md.width || 0) < 400) continue;          // 아이콘·썸네일은 건너뜀
      const f = path.join(OUT, `img${String(i).padStart(2, "0")}.jpg`);
      await sharp(buf).rotate().resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 82 }).toFile(f);
      saved.push(f);
      console.log(`  ${String(i).padStart(2)}. ${md.width}x${md.height} → ${Math.round(fs.statSync(f).size / 1024)}KB`);
      break;
    } catch { /* 다음 옵션 */ }
  }
}

// 한눈에 보는 붙임장
if (saved.length) {
  const W = 300, H = 400, cols = 4;
  const tiles = [];
  for (let n = 0; n < saved.length; n++) {
    tiles.push({
      input: await sharp(saved[n]).resize({ width: W, height: H, fit: "contain", background: "#111" }).toBuffer(),
      left: (n % cols) * W, top: Math.floor(n / cols) * H,
    });
  }
  await sharp({ create: { width: W * cols, height: H * Math.ceil(saved.length / cols), channels: 3, background: "#111" } })
    .composite(tiles).jpeg({ quality: 80 }).toFile(path.join(OUT, "_contact.jpg"));
  console.log(`\n■ 붙임장: ${path.join(OUT, "_contact.jpg")}  — 이걸 열어 고르세요`);
}
console.log(`■ 저장 위치: ${path.resolve(OUT)}`);
console.log("\n다음 순서: 고른 사진을 900px webp 로 줄여 public/images/reviews/ 에 넣고,");
console.log("           src/lib/review-photos.ts 목록에 한 줄 적기 (CLAUDE.md 8장 참고)");
