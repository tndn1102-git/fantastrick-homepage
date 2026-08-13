// .env.local 의 값들을 Cloudflare Worker 시크릿으로 올리기 위한 JSON 을 만든다.
//
//   확인:  node scripts/cf-secrets.cjs            (이름만 출력, 값은 안 보여줌)
//   등록:  node scripts/cf-secrets.cjs --json | npx wrangler secret bulk
//
// 왜 파이프로 넘기나: 시크릿을 임시 파일로 디스크에 떨구지 않기 위해서다.
// (전에 vercel env 를 PowerShell 파이프로 넣었다가 빈 값으로 등록된 적이 있어, 등록 뒤에는
//  반드시 `npx wrangler secret list` 로 이름이 올라왔는지 확인할 것)

const fs = require("fs");
const path = require("path");

// 워커에 있어야 하는 것들. 여기 없는 값은 올리지 않는다(로컬 전용 값이 섞여 올라가지 않게).
const KEYS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_PASSWORD",
  "ADMIN_ID",
  "CRON_SECRET",
  "BANK_WEBHOOK_SECRET",
  // ⚠️ BANK_DRY_RUN 은 여기 넣지 않는다 — 로컬(.env.local)은 안전을 위해 true, 라이브는 false 로
  // 값이 서로 달라야 하는데, bulk 로 올리면 라이브가 연습모드로 되돌아간다.
  // (2026-08-13 실사고: 7/30 에 false 로 전환했던 게 bulk 재등록 때 true 로 덮여
  //  실전 입금이 dry_run 으로 빠짐) 바꿀 땐 단건으로:  printf 'false' | npx wrangler secret put BANK_DRY_RUN
  // 문자·알림톡 (NHN Cloud)
  "NHN_SMS_APPKEY",
  "NHN_SMS_SECRET",
  "NHN_SENDER",
  "NHN_ALIMTALK_APPKEY",
  "NHN_ALIMTALK_SECRET",
  "NHN_SENDER_KEY",
  "NHN_TPL_CONFIRM",
  "NHN_TPL_CANCEL",
  // 직원용 안내문자 앱(reservation-sms)이 오늘 예약을 읽을 때 쓰는 열쇠.
  // 관리자 비밀번호와 **별개** — 새면 이 값만 바꾸면 된다. (api/staff/today)
  "STAFF_TOKEN",
  // 사장님 개인폰 — 1:1 문의·B2B 문의가 들어오면 여기로 알림 문자가 간다(lib/sms.ts notifyOwner).
  // 비워두면 알림이 **조용히 안 나간다**(에러도 안 남음). 번호를 바꿀 땐 이 값만 고치면 된다.
  "ALERT_PHONE",
  // 텔레그램 알림(무료). 이게 있으면 문의 알림이 문자 대신 텔레그램으로 간다.
  // 둘 다 없으면 조용히 건너뛰고 문자로만 간다 — 없어도 사이트는 정상 동작.
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
];

const p = path.join(__dirname, "..", ".env.local");
if (!fs.existsSync(p)) {
  console.error("✗ .env.local 이 없습니다.");
  process.exit(1);
}
const env = {};
for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const out = {};
const empty = [];
for (const k of KEYS) {
  const v = env[k];
  if (v) out[k] = v;
  else empty.push(k);
}

if (process.argv.includes("--json")) {
  process.stdout.write(JSON.stringify(out));
} else {
  console.log("올라갈 값 :", Object.keys(out).join(", ") || "(없음)");
  console.log("비어 있음 :", empty.join(", ") || "(없음)");
  console.log("\n등록하려면:  node scripts/cf-secrets.cjs --json | npx wrangler secret bulk");
}
