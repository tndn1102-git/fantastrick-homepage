/* 예약 현황 API 설명 페이지 — 예약 모아보기 서비스 개발자에게 **이 주소 하나만 보내면 되도록**
 *
 * 왜 페이지로 만드나: 파일로 보내면 버전이 갈린다. 주소를 보내면 늘 최신이 보인다.
 * 검색에는 안 잡히게 한다(손님이 볼 페이지가 아니다).
 *
 * ⚠️ 여기 적힌 내용과 src/app/api/availability/route.ts 는 **같이 고쳐야 한다.**
 *    설명과 실제가 어긋나면 상대는 우리 잘못을 자기 잘못으로 오해하고 시간을 버린다.
 */
import type { Metadata } from "next";
import { THEMES, STORES } from "@/lib/data";
import { CALENDARS } from "@/lib/booked-compat";

export const metadata: Metadata = {
  title: "예약 현황 API — 판타스트릭",
  description: "방탈출 예약 모아보기 서비스용 예약 가능 시간 API 안내",
  robots: { index: false, follow: false },
};

const S = "https://fantastrick.co.kr";

const EXAMPLE = `{
  "store": { "name": "판타스트릭", "url": "https://fantastrick.co.kr", "tel": "010-5536-0483" },
  "reservationOpens": { "daysAhead": 7, "hourKst": 21 },
  "range": { "from": "2026-08-19", "to": "2026-08-25", "days": 7 },
  "generatedAt": "2026-08-19T12:34:56.000+09:00",
  "timezone": "Asia/Seoul",
  "themes": [
    {
      "themeId": "ldc",
      "name": "락다운시티",
      "branch": "판타스트릭 TGC",
      "legacyCalendarId": 24,
      "reserveUrl": "https://fantastrick.co.kr/reserve?theme=ldc",
      "infoUrl": "https://fantastrick.co.kr/rooms/ldc",
      "days": [
        {
          "date": "2026-08-19",
          "slots":  ["11:00", "13:00", "15:00", "17:00", "19:00", "21:00"],
          "open":   ["15:00", "19:00"],
          "closed": ["11:00", "13:00", "17:00", "21:00"]
        }
      ]
    }
  ]
}`;

export default function ReservationApiPage() {
  return (
    <main className="wrap" style={{ maxWidth: 820, margin: "0 auto", padding: "40px 20px 80px", lineHeight: 1.75 }}>
      <h1 style={{ marginBottom: 6 }}>예약 현황 API</h1>
      <p style={{ opacity: 0.75, marginTop: 0 }}>
        판타스트릭 · 방탈출 예약 모아보기 서비스용 · 별도 신청이나 인증키가 필요 없습니다.
      </p>

      <h2>1. 주소</h2>
      <pre style={pre}>GET {S}/api/availability</pre>
      <table style={table}>
        <thead><tr><th style={th}>값</th><th style={th}>설명</th><th style={th}>기본</th></tr></thead>
        <tbody>
          <tr><td style={td}><code>days</code></td><td style={td}>오늘부터 며칠치 (1~30)</td><td style={td}>7</td></tr>
          <tr><td style={td}><code>theme</code></td><td style={td}>특정 테마만 (아래 표의 themeId)</td><td style={td}>전체</td></tr>
        </tbody>
      </table>
      <p style={{ opacity: 0.75 }}>
        예) <code>{S}/api/availability?days=14</code> · <code>{S}/api/availability?theme=ldc</code>
      </p>

      <h2>2. 응답 예시</h2>
      <pre style={pre}>{EXAMPLE}</pre>
      <ul>
        <li><b>open</b> — 지금 예약 가능한 시간. <b>이것만 보시면 됩니다.</b></li>
        <li><b>slots</b> — 그날 운영 회차 전부. “6타임 중 2타임 남음” 같은 표시에 쓰세요.</li>
        <li><b>closed</b> — 마감된 시간(예약 참 + 매장이 막아둔 것). <code>slots − open</code> 과 같습니다.</li>
        <li>회차가 없는 날은 <code>slots</code> 가 빈 배열입니다. 휴무일은 <code>open</code> 이 빈 배열입니다.</li>
        <li>시각은 <b>24시간제 HH:MM</b>, 기준 시간대는 <b>Asia/Seoul</b> 입니다.</li>
        <li><b>지난 시간은 걸러내지 않습니다.</b> “지금 이후”는 보시는 쪽 시계로 판단해주세요.</li>
      </ul>

      <h2>3. 테마 목록</h2>
      <table style={table}>
        <thead><tr><th style={th}>themeId</th><th style={th}>테마</th><th style={th}>지점</th><th style={th}>기존 calendar_id</th></tr></thead>
        <tbody>
          {THEMES.map((t) => (
            <tr key={t.id}>
              <td style={td}><code>{t.id}</code></td>
              <td style={td}>{t.name}</td>
              <td style={td}>{STORES.find((s) => s.id === t.store)?.name ?? "-"}</td>
              <td style={td}>{CALENDARS.find((c) => c.theme === t.id)?.id ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ opacity: 0.75 }}>
        맨 오른쪽은 <b>옛 워드프레스 시절 달력 번호</b>입니다. 그 번호로 방을 구분해 두셨다면
        응답의 <code>legacyCalendarId</code> 로 그대로 이어붙이실 수 있습니다.
      </p>

      <h2>4. 호출 안내</h2>
      <ul>
        <li>응답은 <b>60초 캐시</b>됩니다. 그보다 자주 부르셔도 같은 값이 나옵니다.</li>
        <li><code>?days=7</code> 한 번이면 7일치 전체가 나옵니다. <b>날짜별로 나눠 부르실 필요 없습니다.</b></li>
        <li>권장 주기는 <b>1~2분에 한 번</b>입니다.</li>
        <li>CORS 를 열어두었습니다. 브라우저에서 바로 열어 확인하셔도 됩니다.</li>
        <li>예약창은 <b>이용일 7일 전 21:00(KST)</b> 에 열립니다.</li>
      </ul>

      <h2>5. 기존 방식(워드프레스)에 대해</h2>
      <p>
        옛 <code>/wp-admin/admin-ajax.php</code> 창구도 당분간 그대로 답하도록 열어두었습니다.
        다만 <b>새 API 로 옮기신 뒤에는 닫을 예정</b>입니다. 옮기시면 알려주세요.
      </p>

      <h2>6. 문의</h2>
      <p>
        판타스트릭 · <a href="tel:01055360483">010-5536-0483</a><br />
        규격 변경이 필요하시면 말씀해주세요. <b>있던 항목을 없애거나 이름을 바꾸는 일은 하지 않겠습니다.</b>
      </p>
    </main>
  );
}

const pre: React.CSSProperties = {
  background: "rgba(127,127,127,.12)", padding: "14px 16px", borderRadius: 10,
  overflowX: "auto", fontSize: 13, lineHeight: 1.6,
};
const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse", margin: "10px 0 4px" };
const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", borderBottom: "2px solid rgba(127,127,127,.35)", fontSize: 14 };
const td: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid rgba(127,127,127,.2)", fontSize: 14 };
