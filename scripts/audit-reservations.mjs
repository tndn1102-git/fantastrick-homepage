// 예약 자료 건강검진 — 어긋난 기록 찾기 (읽기만 함, 아무것도 고치지 않는다)
//
//   node scripts/audit-reservations.mjs
//
// 옛 사이트 동기화가 남긴 흔적을 찾다가 만들었다(2026-08-14). 그 사고 말고도
// "조용히 어긋나 있는" 기록이 있는지 한 번에 훑는다. 앞으로도 가끔 돌려보면 좋다.

import { config } from "dotenv";
config({ path: ".env.local" });

const U = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };

const kst = (t) => (t ? new Date(new Date(t).getTime() + 9 * 3600e3).toISOString().replace("T", " ").slice(0, 16) : "-");
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

async function all(path) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${U}/rest/v1/${path}`, { headers: { ...H, Range: `${from}-${from + 999}` } });
    const j = await r.json();
    if (!Array.isArray(j)) throw new Error(JSON.stringify(j).slice(0, 200));
    out.push(...j);
    if (j.length < 1000) return out;
  }
}

const res = await all("reservations?select=*&order=date");
const logs = await all("reservation_logs?select=id,reservation_id,action,detail,created_at&order=created_at");
console.log(`예약 ${res.length}건 · 변경이력 ${logs.length}줄 검사\n`);

const found = [];
const report = (title, rows, how) => {
  console.log(`■ ${title}: ${rows.length}건`);
  rows.slice(0, 15).forEach((r) => console.log("   " + how(r)));
  if (rows.length > 15) console.log(`   … 외 ${rows.length - 15}건`);
  if (rows.length) found.push(`${title} ${rows.length}건`);
  console.log("");
};

const live = res.filter((r) => r.status !== "cancelled");
const line = (r) => `${r.date} ${r.time} ${r.theme_name} · ${r.name} (${r.status}${r.deposit_paid ? "·입금O" : "·입금X"})`;

// ① 한 칸에 예약 두 개 — 손님이 겹쳐 오는 사고
const slot = new Map();
for (const r of live) {
  const k = `${r.theme_id}|${r.date}|${r.time}`;
  slot.set(k, [...(slot.get(k) || []), r]);
}
report("한 칸에 예약이 둘 이상 (겹침)", [...slot.values()].filter((v) => v.length > 1).flat(), line);

// ② 앞으로 날짜인데 아직 입금 대기 — 자동취소를 꺼둬서 계속 남는다
report("앞으로 날짜인데 입금 대기 중", live.filter((r) => r.status === "pending" && r.date >= today),
  (r) => `${line(r)} · 접수 ${kst(r.created_at)}`);

// ③ 지난 날짜인데 아직 대기 — 이미 지난 일이라 정리 대상
report("지난 날짜인데 아직 입금 대기", live.filter((r) => r.status === "pending" && r.date < today),
  (r) => `${line(r)} · 접수 ${kst(r.created_at)}`);

// ④ 확정인데 입금이 안 찍힘 — 돈 계산이 어긋난다
report("확정인데 입금 표시가 없음", live.filter((r) => r.status === "confirmed" && !r.deposit_paid), line);

// ⑤ 입금은 찍혔는데 입금 시각이 없음 — 입출금 내역에서 빠진다
report("입금 표시는 있는데 입금 시각이 비어 있음", res.filter((r) => r.deposit_paid && !r.paid_at), line);

// ⑥ 돌려줄 돈이 남은 것
report("환불이 아직 안 나간 것", res.filter((r) => r.status === "cancelled" && r.deposit_paid && !r.refunded && (r.refund_rate ?? 0) > 0),
  (r) => `${line(r)} · ${Math.round((r.deposit * (r.refund_rate ?? 0)) / 100).toLocaleString()}원 (${r.refund_rate}%) · 취소 ${kst(r.cancelled_at)}`);

// ⑦ 환불했다는데 취소가 아님 — 앞뒤가 안 맞는 기록
report("환불 완료인데 취소 상태가 아님", res.filter((r) => r.refunded && r.status !== "cancelled"), line);

// ⑧ 취소인데 취소 시각이 없음 — 동기화가 지웠을 때 생기던 모양
report("취소인데 취소 시각이 비어 있음", res.filter((r) => r.status === "cancelled" && !r.cancelled_at), line);

// ⑨ 같은 사람이 같은 테마·날짜에 두 번 — 중복 접수
const dup = new Map();
for (const r of live) {
  const k = `${r.phone}|${r.theme_id}|${r.date}`;
  dup.set(k, [...(dup.get(k) || []), r]);
}
report("같은 번호로 같은 날 같은 테마 중복", [...dup.values()].filter((v) => v.length > 1).flat(), line);

// ⑩ 주인 없는 변경이력 — 예약은 지웠는데 이력만 남은 것
const ids = new Set(res.map((r) => r.id));
report("주인 없는 변경이력", logs.filter((l) => !ids.has(l.reservation_id)),
  (l) => `${kst(l.created_at)} ${l.action} (예약 ${String(l.reservation_id).slice(0, 8)} 없음)`);

// ⑪ 이사(8/13) 이후 동기화가 건드린 흔적 — 사장님 조작 없이 값이 바뀐 옛 예약
const MIGRATION = "2026-08-13T00:00:00+09:00";
const touched = res.filter((r) => r.source === "wp-import" && r.date >= today && r.confirmed_at && r.confirmed_at > MIGRATION);
report("이사 후 확정 시각이 새로 찍힌 옛 예약(동기화 흔적일 수 있음)", touched,
  (r) => `${line(r)} · 확정시각 ${kst(r.confirmed_at)}`);

console.log("─".repeat(60));
console.log(found.length ? "살펴볼 것: " + found.join(" / ") : "✔ 어긋난 기록 없음");
