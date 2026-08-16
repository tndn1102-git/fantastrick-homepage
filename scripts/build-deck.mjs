/* 발표 자료 만들기 — 사진을 파일 안에 박아 넣어 "한 파일"로 만든다
 *   node scripts/build-deck.mjs
 *
 *   docs/_deck/template.html   (원본 — 여기를 고친다)
 * + docs/_deck/shots/*.webp    (scripts/capture-deck-shots.mjs 로 찍은 사진)
 * → docs/새홈페이지-소개-발표자료.html   (결과물 — 직접 고치지 말 것)
 *
 * [왜 파일 안에 박나]
 *   사진을 옆에 둔 채로 보내면 상대방 화면에서 사진이 다 깨진다.
 *   한 파일이면 카톡·메일로 그것만 보내도 그대로 보이고, 웹에 올려도 그대로 보인다.
 */
import fs from "node:fs";
import path from "node:path";

/* 만들 수 있는 자료 목록. `node scripts/build-deck.mjs staff` 처럼 골라 만든다(기본: 전부) */
const DECKS = {
  intro: { tpl: "docs/_deck/template.html", out: "docs/새홈페이지-소개-발표자료.html" },
  staff: { tpl: "docs/_deck/staff-template.html", out: "docs/직원교육-홈페이지-설명서.html" },
  mobile: { tpl: "docs/_deck/mobile-template.html", out: "docs/직원교육-설명서-모바일.html" },
};
const pick = process.argv[2];
const targets = pick ? [DECKS[pick]].filter(Boolean) : Object.values(DECKS);
if (!targets.length) { console.log(`만들 자료를 못 찾았습니다. 쓸 수 있는 이름: ${Object.keys(DECKS).join(", ")}`); process.exit(1); }

const SHOTS = "docs/_deck/shots";
for (const { tpl: TPL, out: OUT } of targets) {
  if (!fs.existsSync(TPL)) { console.log(`  ⚠ 원본 없음: ${TPL} — 건너뜁니다`); continue; }
  build(TPL, OUT);
}

function build(TPL, OUT) {

let html = fs.readFileSync(TPL, "utf8");
const used = new Map();

html = html.replace(/\{\{img:([a-z0-9-]+)\}\}/gi, (_, name) => {
  const file = path.join(SHOTS, name + ".webp");
  if (!fs.existsSync(file)) {
    console.log(`  ⚠ 사진 없음: ${name}.webp — 자리를 비워 둡니다`);
    return `<div style="padding:40px;text-align:center;color:#7583ad;font-size:12px">사진 없음: ${name}</div>`;
  }
  const b64 = fs.readFileSync(file).toString("base64");
  used.set(name, (used.get(name) || 0) + 1);
  /* m- 로 시작하면 폰으로 찍은 사진(그대로 봐도 읽힌다).
     그 밖은 PC 화면이라 폰에서 작다 → `pc` 를 붙여 **눌러서 크게 보기** 대상으로 만든다.
     (슬라이드판 자료는 이 class 를 쓰지 않으므로 붙어 있어도 무해하다) */
  const cls = name.startsWith("m-") ? "shot" : "shot pc";
  return `<img class="${cls}" src="data:image/webp;base64,${b64}" alt="${name} 화면" loading="lazy">`;
});

if (/\{\{/.test(html)) console.log("  ⚠ 아직 안 채워진 자리표시자가 남아 있습니다");

fs.writeFileSync(OUT, html);

const mb = (fs.statSync(OUT).size / 1024 / 1024).toFixed(2);
console.log(`■ 만들었습니다 → ${OUT}`);
console.log(`   사진 ${used.size}종 · ${[...used.values()].reduce((a, b) => a + b, 0)}번 사용 · 파일 ${mb}MB`);
}
