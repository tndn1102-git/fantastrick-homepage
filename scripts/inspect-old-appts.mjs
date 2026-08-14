// 옛 사이트의 특정 예약(들) 자세히 보기 — 읽기 전용
//   node scripts/inspect-old-appts.mjs 38505 38706 ...

import { config } from "dotenv";
import mysql from "mysql2/promise";
import { execSync } from "node:child_process";
config({ path: ".env.local" });

const ids = process.argv.slice(2);
if (!ids.length) { console.error("예약 번호를 붙여 주세요."); process.exit(1); }

const conf = execSync(`curl -s --max-time 40 "ftp://fantastrick:wt13%21%2313bo@fantastrick.gabia.io/wp-config.php"`, { maxBuffer: 5e6 }).toString();
const pick = (n) => (conf.match(new RegExp(`define\\(\\s*'${n}'\\s*,\\s*'([^']*)'`)) || [])[1];
const PREFIX = (conf.match(/\$table_prefix\s*=\s*'([^']*)'/) || [])[1] || "wp_";
const [host, port] = pick("DB_HOST").split(":");
const cn = await mysql.createConnection({ host, port: Number(port || 3306), user: pick("DB_USER"), password: pick("DB_PASSWORD"), database: pick("DB_NAME"), connectTimeout: 20000 });

const list = ids.map((i) => cn.escape(i)).join(",");
const [posts] = await cn.query(`SELECT ID, post_status, post_date, post_title, post_parent FROM ${PREFIX}posts WHERE ID IN (${list})`);
const [metas] = await cn.query(`SELECT post_id, meta_key, meta_value FROM ${PREFIX}postmeta WHERE post_id IN (${list})`);
await cn.end();

const byId = new Map();
for (const m of metas) byId.set(m.post_id, { ...(byId.get(m.post_id) || {}), [m.meta_key]: m.meta_value });

for (const p of posts) {
  const m = byId.get(p.ID) || {};
  const ts = Number(m._appointment_timestamp || 0);
  const when = ts ? new Date(ts * 1000).toISOString().replace("T", " ").slice(0, 16) : "-";
  console.log(`■ #${p.ID}  ${p.post_status}  이용 ${when}`);
  console.log(`   제목: ${p.post_title || "(없음)"}  · 캘린더(테마) id=${p.post_parent}`);
  const keys = Object.keys(m).filter((k) => !/^_edit|^_wp_/.test(k));
  for (const k of keys) console.log(`   ${k} = ${String(m[k]).slice(0, 90)}`);
  console.log("");
}
