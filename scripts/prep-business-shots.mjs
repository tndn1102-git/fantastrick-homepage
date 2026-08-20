/* 비즈니스 페이지에 넣을 **실제 화면 캡처**를 웹용으로 다듬는다
 *   node scripts/prep-business-shots.mjs <원본폴더>
 *
 * [왜 미리 줄이나] next/image 자동 변환을 꺼둔 상태라 아무도 안 줄여준다(next.config.ts 주석).
 *   원본 그대로 올리면 3~5MB 짜리가 그대로 손님 폰으로 내려간다.
 *
 * [규칙]
 *   · 데스크톱 화면 = 가로 1440(화면 표시폭 720의 2배)
 *   · 폰 화면 = 가로 780(표시폭 390의 2배)
 *   · 세로가 너무 길면 위에서부터 잘라 쓴다 — 아래로 흐르는 빈 표는 설득에 도움이 안 된다
 *   · webp 품질 82 (글자가 뭉개지지 않는 하한선)
 *
 * ⚠️ 개인정보는 **캡처할 때 이미 가명으로 바꿔** 넣었다(블러 아님).
 *    조사 결과 국내외 22곳 중 블러를 쓴 곳이 0곳이었다 — 블러는 "숨길 게 있다"는 신호가 된다.
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC = process.argv[2];
if (!SRC || !fs.existsSync(SRC)) { console.error("원본 폴더를 찾을 수 없습니다."); process.exit(1); }
const OUT = "public/images/business";
fs.mkdirSync(OUT, { recursive: true });

/** [원본, 저장이름, 가로, 세로상한(넘으면 위에서 자름)] */
const JOBS = [
  ["shots/img/schedule/calendar-full.png", "shot-schedule.webp", 1440, 1080],
  ["real/attendance-admin.png", "shot-attendance.webp", 1440, 1150],
  ["real/coupon-admin.png", "shot-coupon.webp", 1440, 1080],
  ["real/home-pc.png", "shot-homepage.webp", 1440, 1080],
  ["real/attendance-phone.png", "shot-attendance-phone.webp", 780, 1600],
];

for (const [rel, name, w, maxH] of JOBS) {
  const src = path.join(SRC, rel);
  if (!fs.existsSync(src)) { console.log(`   건너뜀(원본 없음): ${rel}`); continue; }
  const meta = await sharp(src).metadata();
  let img = sharp(src).resize({ width: w, withoutEnlargement: true });
  const scaled = Math.round((meta.height || 0) * (w / (meta.width || w)));
  if (scaled > maxH) img = img.extract({ left: 0, top: 0, width: w, height: maxH });
  await img.webp({ quality: 82 }).toFile(path.join(OUT, name));
  const kb = Math.round(fs.statSync(path.join(OUT, name)).size / 1024);
  console.log(`   ${name}  ${w}x${Math.min(scaled, maxH)}  ${kb}KB   (원본 ${meta.width}x${meta.height})`);
}
console.log(`\n저장 위치: ${OUT}`);
