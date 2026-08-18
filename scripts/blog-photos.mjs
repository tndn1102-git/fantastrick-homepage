/* 블로그 후기 사진 — 후보 내려받기 + **규칙으로 자동 고르기** (읽기 전용, --apply 로만 저장)
 *
 *   node scripts/blog-photos.mjs <블로그주소>              고르기만 하고 보여준다
 *   node scripts/blog-photos.mjs <블로그주소> --apply       고른 사진을 실제로 넣는다
 *
 * 결과물
 *   · blog-photos-out/_contact.jpg  — 후보 전부 + **채택/제외 표시**. 이거 한 장만 보면 된다.
 *   · --apply 면 public/images/reviews/ 에 900px webp 로 저장하고,
 *     src/lib/review-photos.ts 에 붙여넣을 줄을 찍어준다.
 *
 * ───────── 고르는 규칙 (2026-08-18 실측으로 정함) ─────────
 * 제외 ① 400px 미만            → 아이콘·썸네일
 * 제외 ② 정사각형(±5%)         → 블로거 프로필·평가 카드 (실측: 936x936 캐릭터, 800x800 카드)
 * 제외 ③ 글의 첫 사진          → 대개 대표 카드·프로필
 * 제외 ④ 살색 픽셀 3% 이상     → **사람이 찍혔을 가능성** (실측 단체사진 11.8% / 35.2%)
 * 채택   남은 것 중 앞에서 2장
 *
 * ⚠️ 완전히 안전하지는 않다 — 실험 결과를 그대로 적어둔다.
 *    살색 비율도, 살색 덩어리 크기도 **단체사진과 좋은 사진을 깨끗이 못 가른다.**
 *      단체사진 살색 11.8% / 35.2% · 덩어리 3.0% / 20.6%
 *      기록보드(좋은 사진) 살색 7.1% · 덩어리 2.5%   ← 단체사진 하나와 거의 붙어 있다
 *    그래서 문턱을 3% 로 낮게 잡아 **놓치더라도 안 넣는 쪽**으로 기울였다.
 *    그래도 긴팔·긴바지에 어두운 방이면 사람이 찍혔는데도 3% 아래로 나올 수 있다.
 *    → **_contact.jpg 를 한 번 보고 넘기는 습관을 남길 것.** 초상권 사고는 되돌릴 수 없다.
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const input = process.argv[2];
const APPLY = process.argv.includes("--apply");
if (!input) {
  console.log("쓰는 법: node scripts/blog-photos.mjs <블로그주소> [--apply]");
  process.exit(1);
}

const TMP = "blog-photos-out";
const DEST = "public/images/reviews";
fs.mkdirSync(TMP, { recursive: true });
if (APPLY) fs.mkdirSync(DEST, { recursive: true });

const pageUrl = input.replace("blog.naver.com", "m.blog.naver.com");
const canonical = input.replace("m.blog.naver.com", "blog.naver.com").split("?")[0];

const html = await (await fetch(pageUrl, {
  headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15" },
})).text();

/* ⚠️ 같은 사진이 ?type= 옵션만 다르게 여러 번 나오는데 그중 일부는 404 다.
      경로별로 묶어 두고 200 이 나올 때까지 바꿔가며 시도한다. */
const re = /https?:\/\/[^"'\s]*?(?:postfiles|mblogthumb-phinf|blogfiles)[^"'\s]*?\.(?:jpg|jpeg|png)[^"'\s]*/gi;
const groups = new Map();
for (const m of html.matchAll(re)) {
  const key = m[0].split("?")[0];
  if (!groups.has(key)) groups.set(key, []);
  const arr = groups.get(key);
  if (!arr.includes(m[0])) arr.push(m[0]);
}

const isSkin = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return r > 95 && g > 40 && b > 20 && mx - mn > 15 && Math.abs(r - g) > 15 && r > g && r > b;
};
async function skinRatio(buf) {
  const { data, info } = await sharp(buf).resize({ width: 120 }).raw().toBuffer({ resolveWithObject: true });
  let skin = 0, total = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    total++;
    if (isSkin(data[i], data[i + 1], data[i + 2])) skin++;
  }
  return skin / total;
}

const cands = [];
let idx = 0;
for (const [key, variants] of groups) {
  idx++;
  for (const u of [...variants, key + "?type=w966", key]) {
    try {
      const r = await fetch(u);
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      const md = await sharp(buf).metadata();
      /* ⚠️ 같은 사진의 ?type=w80 같은 **썸네일 변형이 먼저 200 을 준다.**
            그걸 잡으면 전부 "너무 작음"으로 걸러진다(2026-08-18 실제로 8장 전부 80px 로 잡힘).
            작으면 채택하지 말고 **다음 변형을 계속 시도**한다. */
      if ((md.width || 0) < 400) continue;
      const file = path.join(TMP, `img${String(idx).padStart(2, "0")}.jpg`);
      await sharp(buf).rotate().resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 82 }).toFile(file);
      cands.push({ n: idx, file, w: md.width || 0, h: md.height || 0, skin: await skinRatio(buf) });
      break;
    } catch { /* 다음 옵션 */ }
  }
}

// ── 규칙 적용 ──
let picked = 0;
for (const c of cands) {
  const square = Math.abs(c.w / (c.h || 1) - 1) < 0.05;
  if (c.w < 400 || c.h < 400) c.why = "너무 작음(아이콘)";
  else if (square) c.why = "정사각형(프로필·카드)";
  else if (c.n === 1) c.why = "글의 첫 사진(대표 카드)";
  else if (c.skin >= 0.03) c.why = `사람 가능성(살색 ${(c.skin * 100).toFixed(1)}%)`;
  else if (picked >= 2) c.why = "이미 2장 골랐음";
  else { c.pick = true; picked++; }
}

console.log(`■ 후보 ${cands.length}장 · 자동 채택 ${picked}장\n`);
for (const c of cands) {
  console.log(`  ${c.pick ? "✔ 채택" : "· 제외"}  img${String(c.n).padStart(2, "0")}  ${c.w}x${c.h}  살색 ${(c.skin * 100).toFixed(1)}%  ${c.why || ""}`);
}

// ── 붙임장: 채택은 초록 테두리, 제외는 어둡게 ──
if (cands.length) {
  const W = 300, H = 400, cols = 4;
  const tiles = [];
  for (let i = 0; i < cands.length; i++) {
    const c = cands[i];
    let img = sharp(c.file).resize({ width: W - 8, height: H - 8, fit: "contain", background: "#111" });
    if (!c.pick) img = img.modulate({ brightness: 0.45 });          // 제외는 어둡게
    const inner = await img.png().toBuffer();
    const frame = await sharp({ create: { width: W, height: H, channels: 3, background: c.pick ? "#2fc47f" : "#333" } })
      .composite([{ input: inner, left: 4, top: 4 }]).png().toBuffer();
    tiles.push({ input: frame, left: (i % cols) * W, top: Math.floor(i / cols) * H });
  }
  await sharp({ create: { width: W * cols, height: H * Math.ceil(cands.length / cols), channels: 3, background: "#111" } })
    .composite(tiles).jpeg({ quality: 80 }).toFile(path.join(TMP, "_contact.jpg"));
  console.log(`\n■ 확인용 붙임장: ${path.resolve(path.join(TMP, "_contact.jpg"))}`);
  console.log("   초록 테두리 = 채택 · 어두운 것 = 제외.  **한 번 보고 넘기세요** (초상권 사고는 되돌릴 수 없습니다)");
}

// ── 저장 ──
if (APPLY) {
  const slug = (canonical.match(/blog\.naver\.com\/([^/]+)\/(\d+)/) || []).slice(1).join("-") || "review";
  const lines = [];
  let k = 0;
  for (const c of cands.filter((x) => x.pick)) {
    k++;
    const name = `${slug}-${k}.webp`;
    await sharp(c.file).resize({ width: 900, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(DEST, name));
    lines.push(`    { src: "/images/reviews/${name}", alt: "후기 사진 ${k}" },`);
    console.log(`\n  저장: ${DEST}/${name}`);
  }
  if (lines.length) {
    console.log(`\n■ src/lib/review-photos.ts 에 아래를 넣으세요 (alt 는 사진에 맞게 고쳐주세요)\n`);
    console.log(`  "${canonical}": [`);
    lines.forEach((l) => console.log(l));
    console.log(`  ],`);
  }
} else {
  console.log("\n( 실제로 넣으려면 뒤에 --apply 를 붙여 다시 실행하세요 )");
}
