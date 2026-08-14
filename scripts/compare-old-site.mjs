// 옛 워드프레스와 새 홈페이지 예약 대조 (읽기만 함)
//
//   node scripts/compare-old-site.mjs
//
// "옛 사이트에는 있는데 우리에게 없는 예약" 이 있는지 확인한다.
// 동기화를 중단(2026-08-14)하기 전에 빠진 게 없는지 마지막으로 맞춰보려고 만들었다.
//
// ⚠️ 옛 서버의 wp-config.php 에서 접속 정보를 읽지만 **화면에 찍지 않는다.**
// ⚠️ 읽기 전용이다. 어느 쪽도 고치지 않는다.

import { config } from "dotenv";
import mysql from "mysql2/promise";
config({ path: ".env.local" });

/* ── 옛 서버 설정에서 DB 접속 정보 꺼내기 (FTP) ── */
const FTP = "ftp://fantastrick:wt13%21%2313bo@fantastrick.gabia.io/wp-config.php";
const { execSync } = await import("node:child_process");
const conf = execSync(`curl -s --max-time 40 "${FTP}"`, { maxBuffer: 5e6 }).toString();

const pick = (name) => (conf.match(new RegExp(`define\\(\\s*'${name}'\\s*,\\s*'([^']*)'`)) || [])[1];
const DB = { host: pick("DB_HOST"), user: pick("DB_USER"), password: pick("DB_PASSWORD"), database: pick("DB_NAME") };
const PREFIX = (conf.match(/\$table_prefix\s*=\s*'([^']*)'/) || [])[1] || "wp_";
if (!DB.host || !DB.user) { console.error("✗ wp-config.php 에서 접속 정보를 못 읽었습니다."); process.exit(1); }
console.log(`옛 DB 접속 정보 확인됨 (호스트 ${DB.host.split(":")[0]}, 표 접두사 ${PREFIX})\n`);

/* ── 옛 사이트의 '앞으로 예약' 읽기 ── */
const [hostname, port] = DB.host.split(":");
const cn = await mysql.createConnection({ host: hostname, port: Number(port || 3306), user: DB.user, password: DB.password, database: DB.database, connectTimeout: 20000 });

const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const [rows] = await cn.execute(
  `SELECT p.ID, p.post_status,
          MAX(CASE WHEN m.meta_key='_appointment_timestamp' THEN m.meta_value END) AS ts,
          MAX(CASE WHEN m.meta_key='_appointment_name'      THEN m.meta_value END) AS nm
     FROM ${PREFIX}posts p
     JOIN ${PREFIX}postmeta m ON m.post_id = p.ID
    WHERE p.post_type='booked_appointments'
    GROUP BY p.ID, p.post_status
   HAVING ts IS NOT NULL`,
);
await cn.end();

const oldFuture = rows
  .map((r) => ({ id: String(r.ID), status: r.post_status, name: r.nm, date: new Date(Number(r.ts) * 1000).toISOString().slice(0, 10) }))
  .filter((r) => r.date >= today && r.status === "publish");
console.log(`옛 사이트: 오늘 이후 살아있는 예약 ${oldFuture.length}건`);

/* ── 우리 쪽 읽기 ── */
const U = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ours = await (await fetch(`${U}/rest/v1/reservations?select=memo,name,theme_name,date,time,status&source=eq.wp-import&date=gte.${today}`,
  { headers: { apikey: K, Authorization: `Bearer ${K}` } })).json();
const ourIds = new Set(ours.map((r) => (String(r.memo || "").match(/예약 #(\d+)/) || [])[1]).filter(Boolean));
console.log(`우리 사이트: 옛 사이트에서 온 오늘 이후 예약 ${ours.length}건 (취소 포함)\n`);

const missing = oldFuture.filter((o) => !ourIds.has(o.id));
console.log(`■ 옛 사이트엔 있는데 우리에게 아예 없는 예약: ${missing.length}건`);
missing.forEach((m) => console.log(`   ⚠ #${m.id} ${m.date} ${m.name}`));

const cancelledHere = oldFuture.filter((o) => {
  const r = ours.find((x) => String(x.memo || "").includes(`예약 #${o.id}`));
  return r && r.status === "cancelled";
});
console.log(`\n■ 옛 사이트엔 살아있는데 우리 쪽은 취소 상태: ${cancelledHere.length}건`);
console.log("   (이사 후 사장님이 우리 사이트에서 취소한 것 — 새 사이트가 정답이므로 정상)");
cancelledHere.forEach((o) => {
  const r = ours.find((x) => String(x.memo || "").includes(`예약 #${o.id}`));
  console.log(`   · #${o.id} ${r.date} ${r.time} ${r.theme_name} ${r.name}`);
});
