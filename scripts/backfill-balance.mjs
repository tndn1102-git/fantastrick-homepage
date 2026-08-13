// 지난 입금 기록에 "현장 잔금" 규칙을 소급 적용 (1회용)
//
//   node scripts/backfill-balance.mjs          → 무엇이 바뀔지 보기만 함
//   node scripts/backfill-balance.mjs --apply  → 실제로 딱지 붙이기
//
// 바꾸는 것은 deposits.status 라벨 하나뿐. 예약·돈은 건드리지 않는다.

import { config } from "dotenv";
import { findBalanceMatch, kstDatesAround } from "../src/lib/bank/balance.ts";

config({ path: ".env.local" });
const URL_ = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes("--apply");

const api = async (path, init) => {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
};

const deps = await api("deposits?select=id,depositor_name,amount,received_at&status=eq.no_match&order=received_at.desc");
console.log(`맞는 예약 없음 = ${deps.length}건 검사\n`);

let hit = 0;
for (const d of deps) {
  const ms = new Date(d.received_at).getTime();
  const dates = kstDatesAround(ms).map((s) => `"${s}"`).join(",");
  const rows = await api(`reservations?select=id,name,theme_name,date,time&status=eq.confirmed&date=in.(${dates})`);
  const m = findBalanceMatch(d.depositor_name, ms, rows);
  if (!m) continue;
  hit++;
  const r = m.reservation;
  console.log(`✔ ${d.depositor_name} ${d.amount.toLocaleString()}원 → ${r.theme_name} ${r.date} ${r.time} (플레이 ${m.minutesToPlay}분 전)`);
  if (APPLY) {
    await api(`deposits?id=eq.${d.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "balance", matched_reservation_id: r.id }),
    });
  }
}

console.log(`\n${hit}건이 현장 잔금${APPLY ? "으로 바뀌었습니다." : "입니다. --apply 를 붙이면 반영합니다."}`);
