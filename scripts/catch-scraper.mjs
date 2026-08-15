// 특정 IP 가 보내는 요청을 통째로 잡아 정체를 본다 (읽기 전용)
//   npx wrangler tail fantastrick-homepage --format json > t.json
//   node scripts/catch-scraper.mjs t.json 106.240.15.242

import fs from "node:fs";

const file = process.argv[2] || "t.json";
const TARGET = process.argv[3];

const txt = fs.readFileSync(file, "utf8");
// 요청 객체 단위로 자른다 (여러 줄 JSON 이라 줄 단위로는 못 읽는다)
const blocks = txt.split('"request": {').slice(1);

const hits = [];
for (const b of blocks) {
  const get = (k) => (b.match(new RegExp(`"${k}": "([^"]*)"`)) || [])[1] || "";
  const ip = get("cf-connecting-ip");
  if (TARGET && ip !== TARGET) continue;
  hits.push({
    ip,
    url: get("url"),
    ua: get("user-agent"),
    referer: get("referer"),
    lang: get("accept-language"),
    accept: get("accept"),
    country: get("cf-ipcountry"),
    secFetch: get("sec-fetch-mode"),
    chUa: get("sec-ch-ua"),
  });
}

if (!hits.length) { console.log(`(${TARGET || "전체"} 에서 잡힌 요청이 없습니다 — 잠잠한 구간이었습니다)`); process.exit(0); }

const h = hits[0];
console.log(`■ ${TARGET} 이 보내는 요청 — 잡힌 ${hits.length}건 중 첫 건\n`);
console.log(`   나라        : ${h.country}`);
console.log(`   프로그램 이름: ${h.ua}`);
console.log(`   어디서 왔나 : ${h.referer || "(없음 — 사람이 링크를 눌러 온 게 아니라는 뜻)"}`);
console.log(`   언어 설정   : ${h.lang || "(없음 — 진짜 브라우저면 거의 항상 있다)"}`);
console.log(`   받고 싶은 것 : ${h.accept || "(없음)"}`);
console.log(`   브라우저 표식: ${h.chUa || "(없음 — 크롬이라면서 크롬 표식이 없다)"}`);
console.log(`   요청 방식   : ${h.secFetch || "(없음)"}`);

const themes = {}, dates = new Set();
for (const x of hits) {
  const q = new URL(x.url).searchParams;
  const t = q.get("theme"), d = q.get("date");
  if (t) themes[t] = (themes[t] || 0) + 1;
  if (d) dates.add(d);
}
console.log(`\n■ 무엇을 긁어가나`);
console.log(`   테마별 조회: ${JSON.stringify(themes)}`);
const ds = [...dates].sort();
console.log(`   날짜 ${ds.length}개 : ${ds[0]} ~ ${ds[ds.length - 1]}`);
console.log(`\n   주소 예시:`);
hits.slice(0, 6).forEach((x) => console.log(`     ${x.url.replace("https://fantastrick.co.kr", "")}`));
