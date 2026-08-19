/* 빠방 목록에 우리 예약 정보가 채워지는지 **계속 지켜보기** (읽기 전용)
 *
 *   node scripts/watch-bbabang.mjs [분] [횟수]     기본: 5분마다 36번 (3시간)
 *
 * 그쪽 앱이 쓰는 공개 검색 자료를 그 앱과 똑같은 방법으로 조회한다(읽기만 한다).
 * 결과는 화면과 `bbabang-watch.log` 두 곳에 남는다 — 바뀐 순간을 놓치지 않기 위해서.
 *
 * 왜 필요한가: 그쪽 목록이 언제 다시 만들어지는지 알 수 없다(갱신 시각을 안 적어둔다).
 *   6분 간격으로 다른 매장 200곳을 비교했을 때 한 곳도 안 바뀌었다 → 꽤 드물게 만든다.
 *   그래서 사람이 들여다보는 대신 이 스크립트가 지켜본다.
 */
import fs from "node:fs";

const MIN = Number(process.argv[2] || 5);
const TIMES = Number(process.argv[3] || 36);
const LOG = "bbabang-watch.log";

/* 그쪽 앱이 쓰는 공개 검색 열쇠 — 앱 화면에 그대로 실려 있는 값이다(비밀이 아니다). */
const AUTH = "Bearer F3WdGD8S3783e99ba7d4508fa06c0dc6d1822e2bd73b87bfe2dd204eae14eb34220cda75";

async function look() {
  const r = await fetch("https://q.keigon.net/indexes/qrooms/search", {
    method: "POST",
    headers: { authorization: AUTH, "content-type": "application/json" },
    body: JSON.stringify({ q: "판타스트릭", limit: 20 }),
  });
  if (!r.ok) return { err: `HTTP ${r.status}` };
  const j = await r.json();
  const out = {};
  for (const h of (j.hits || []).filter((x) => /판타스트릭/.test(x.store_name || ""))) {
    const key = `${h.store_name} / ${h.title}`;
    out[key] = [0, 1, 2, 3, 4, 5, 6].map((i) => (h[`reserve_times_d${i}`] || []).length);
  }
  return { out };
}

let prev = "";
for (let n = 1; n <= TIMES; n++) {
  const t = new Date(Date.now() + 9 * 3600e3).toISOString().replace("T", " ").slice(0, 19);
  let line;
  try {
    const { out, err } = await look();
    if (err) line = `${t}  조회실패 ${err}`;
    else {
      const total = Object.values(out).flat().reduce((a, b) => a + b, 0);
      line = `${t}  합계 ${String(total).padStart(3)}칸 | ` +
        Object.entries(out).map(([k, v]) => `${k.split("/")[1].trim()}=${v.join("·")}`).join("  ");
    }
  } catch (e) { line = `${t}  오류 ${String(e.message).slice(0, 60)}`; }

  const body = line.slice(20);
  if (body !== prev) {
    console.log(body.includes("합계   0칸") ? `${line}   (아직 비어있음)` : `${line}   ⭐ 바뀜!`);
    fs.appendFileSync(LOG, line + "\n");
    prev = body;
  } else if (n % 6 === 0) {
    console.log(`${line}   (변화 없음 ${n}/${TIMES})`);
  }
  if (n < TIMES) await new Promise((s) => setTimeout(s, MIN * 60_000));
}
console.log("■ 감시 종료");
