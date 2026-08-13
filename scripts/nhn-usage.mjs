// NHN 알림톡·문자 사용량 집계 (요금 가늠용)
//
//   node scripts/nhn-usage.mjs [일수]        기본 30일
//
// NHN 서버에 직접 물어본다. 우리 sms_log 는 "우리가 보낸 것"만 알지만,
// NHN 은 **실제로 접수·과금된 것**을 안다. 둘이 다르면 NHN 쪽이 맞다.
//
// ⚠️ 알림톡 열쇠는 로컬(.env.local)에 없고 Cloudflare 에만 있다 → 알림톡은 0건으로 나온다.
//    알림톡 건수는 관리자 화면(알림톡 탭)이나 /api/admin/alimtalk?days=30 으로 본다.
//
// ⚠️ 이 스크립트가 내는 것은 **건수**다. 최종 청구액은 NHN 콘솔 > 이용요금이 정답이다.
//    단가는 계약·프로모션에 따라 다르므로 아래 단가는 "가늠용"으로만 쓸 것.

import fs from "node:fs";
import path from "node:path";

const env = {};
for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const DAYS = Math.min(30, Math.max(1, Number(process.argv[2] || 30)));
const kst = (msAgo) => new Date(Date.now() + 9 * 3600e3 - msAgo).toISOString().slice(0, 19).replace("T", " ");
const START = kst(DAYS * 86400e3), END = kst(0);

// 가늠용 단가(원). NHN 공개 요금표 기준 — 계약에 따라 다를 수 있다.
const PRICE = { alimtalk: 9, sms: 9, lms: 30, mms: 100 };

console.log(`■ 기간: ${START} ~ ${END} (${DAYS}일)\n`);

/* ── 알림톡 ── */
let at = { total: 0, ok: 0, fail: 0 };
{
  const key = env.NHN_ALIMTALK_APPKEY, sec = env.NHN_ALIMTALK_SECRET;
  const host = "https://kakaotalk-bizmessage.api.nhncloudservice.com";
  for (let page = 1; page <= 20; page++) {
    const qs = new URLSearchParams({ startRequestDate: START, endRequestDate: END, pageNum: String(page), pageSize: "1000" });
    const r = await fetch(`${host}/alimtalk/v2.3/appkeys/${key}/messages?${qs}`, { headers: { "X-Secret-Key": sec } });
    const j = await r.json();
    if (!j.header?.isSuccessful) { console.log("알림톡 조회 실패:", j.header?.resultMessage); break; }
    const list = j.messageSearchResultResponse?.messages ?? [];
    for (const m of list) {
      at.total++;
      if (String(m.messageStatus) === "COMPLETED" && String(m.resultCode) === "1000") at.ok++; else at.fail++;
    }
    if (list.length < 1000) break;
  }
}

/* ── 문자(SMS/LMS) ── */
// ⚠️ 조회 주소는 **보낼 때와 같은 경로에 GET** 이다. /sendings 같은 주소는 없다(Not found).
//    단문과 장문이 서로 다른 목록이라 두 번 물어봐야 한다.
const sms = { sms: 0, mms: 0, fail: 0 };
{
  const key = env.NHN_SMS_APPKEY, sec = env.NHN_SMS_SECRET;
  for (const kind of ["sms", "mms"]) {
    for (let page = 1; page <= 20; page++) {
      const qs = new URLSearchParams({ startRequestDate: START, endRequestDate: END, pageNum: String(page), pageSize: "1000" });
      const url = `https://sms.api.nhncloudservice.com/sms/v3.0/appKeys/${key}/sender/${kind}?${qs}`;
      const r = await fetch(url, { headers: { "X-Secret-Key": sec } });
      const j = await r.json();
      if (!j.header?.isSuccessful) { console.log(`문자(${kind}) 조회 실패:`, j.header?.resultMessage); break; }
      const list = j.body?.data ?? [];
      for (const m of list) {
        const ok = String(m.resultCodeName ?? "") === "성공" || String(m.resultCode ?? "") === "0";
        if (ok) sms[kind]++; else sms.fail++;
      }
      if (list.length < 1000) break;
    }
  }
}
const won = (n) => n.toLocaleString() + "원";
const cost = at.ok * PRICE.alimtalk + sms.sms * PRICE.sms + sms.mms * PRICE.lms;

console.log("■ 알림톡");
console.log(`   접수 ${at.total}건 · 도착 ${at.ok}건 · 실패 ${at.fail}건`);
console.log("\n■ 문자");
console.log(`   단문 ${sms.sms}건 · 장문 ${sms.mms}건 · 실패 ${sms.fail}건`);
console.log("\n■ 가늠 금액 (단가: 알림톡 9원 · 단문 9원 · 장문 30원)");
console.log(`   약 ${won(cost)}`);
console.log("\n   ⚠️ 정확한 청구액은 NHN 콘솔 > 이용 요금에서 확인하세요. 단가는 계약마다 다릅니다.");
