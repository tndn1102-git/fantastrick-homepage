// 사진을 미리 줄여서 "정적 파일"로 만든다 (요청 1건도 서버를 안 깨우게)
//   node scripts/images-to-webp.mjs [--apply]
//
// [왜 하나]
//   지금은 손님이 사진을 볼 때마다 /_next/image 가 서버(워커)를 깨워서 그 자리에서 크기를
//   줄여 준다. 하루 6,700번. 클라우드플레어 무료 한도(하루 10만 요청)를 갉아먹는 3위였다.
//   미리 줄여 두면 **정적 파일**이 되고, 정적 파일 요청은 클라우드플레어에서 공짜·무제한이다.
//   (근거: Workers static assets billing — "Requests to static assets are free and unlimited")
//
// [고른 크기의 근거]
//   실제 트래픽을 녹화해 보니 요청되는 크기는 w=640 과 w=256 두 가지뿐이었다(2026-08-16).
//   화면에 적힌 sizes 값(예: 280px)의 2배(고해상도 화면 대비)를 목표로 잡았다.
//
// ⚠️ 원본은 backups/ 로 옮겨 보관한다. 지우지 않는다.

import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const APPLY = process.argv.includes("--apply");
const SRC = "public/images";
const BACKUP = "backups/images-원본-20260816";

/** width = 목표 가로폭(px). null 이면 원본 크기 유지(이미 충분히 작음).
 *  alpha = 투명을 실제로 쓰는가(마스코트만 해당). */
const PLAN = [
  { file: "poster-bride.jpg", width: null, alpha: false, why: "포스터 — 원본이 724px, 표시 640px 이라 그대로" },
  { file: "poster-time.jpg", width: null, alpha: false, why: "포스터 — 원본이 728px" },
  { file: "poster-duat.png", width: null, alpha: false, why: "포스터 — 투명 안 씀" },
  { file: "poster-ldc.png", width: null, alpha: false, why: "포스터 — 투명 안 씀" },
  { file: "event-birthday.png", width: 800, alpha: false, why: "이벤트 카드 — 1080은 과함" },
  { file: "review-event.png", width: 1120, alpha: false, why: "모달에서 560px 표시 × 2배" },
  { file: "stores-map.png", width: 1200, alpha: false, why: "지점 안내 지도" },
  { file: "mascot-fanta-v4.png", width: 560, alpha: true, why: "280px 표시 × 2배 · 투명 유지" },
  { file: "mascot-tricky-v4.png", width: 560, alpha: true, why: "280px 표시 × 2배 · 투명 유지" },
];

const kb = (n) => (n / 1024).toFixed(0).padStart(5) + "KB";

if (APPLY) fs.mkdirSync(BACKUP, { recursive: true });

let before = 0, after = 0;
console.log(APPLY ? "■ 실제 변환 (--apply)\n" : "■ 미리보기 — 실제로 바꾸려면 --apply\n");
console.log("파일".padEnd(24) + "  전 →   후    줄어든 비율   설명");

for (const p of PLAN) {
  const src = path.join(SRC, p.file);
  if (!fs.existsSync(src)) { console.log(p.file.padEnd(24) + "  ⚠ 파일 없음"); continue; }

  const out = path.join(SRC, p.file.replace(/\.(png|jpg|jpeg)$/i, ".webp"));
  const oldSize = fs.statSync(src).size;

  let img = sharp(src);
  if (p.width) img = img.resize({ width: p.width, withoutEnlargement: true });
  // 투명을 안 쓰는 그림은 알파 채널을 떼어낸다 — 그것만으로도 꽤 줄어든다.
  if (!p.alpha) img = img.flatten({ background: "#ffffff" });
  const buf = await img.webp({ quality: 82, effort: 6 }).toBuffer();

  before += oldSize; after += buf.length;
  const pct = (100 - (buf.length / oldSize) * 100).toFixed(0);
  console.log(p.file.padEnd(24) + kb(oldSize) + " →" + kb(buf.length) + "   -" + String(pct).padStart(2) + "%    " + p.why);

  if (APPLY) {
    fs.writeFileSync(out, buf);
    fs.renameSync(src, path.join(BACKUP, p.file)); // 원본은 보관 (지우지 않음)
  }
}

console.log("\n합계  " + kb(before) + " → " + kb(after) + "   (-" + (100 - (after / before) * 100).toFixed(0) + "%)");
if (APPLY) console.log("\n원본 " + PLAN.length + "개는 " + BACKUP + " 로 옮겨 보관했습니다.");
