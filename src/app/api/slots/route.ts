import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { sweepExpiredReservations } from "@/lib/expire";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { getConfig } from "@/lib/settings";
import { RESERVATION_OPEN_DAYS_AHEAD, RESERVATION_OPEN_HOUR_KST } from "@/lib/util";
import { THEMES, slotsForThemeDate, themeById } from "@/lib/data";

/** 이 응답을 클라우드플레어가 30초 동안 대신 돌려준다 — 같은 질문이 몰려도 서버는 한 번만 깬다.
 *  마감 판정의 최종 책임은 서버(uq_res_slot)에 있으므로 30초 정도 낡아도 이중예약이 되지 않는다.
 *  화면 쪽 재확인 주기(60초)보다 짧게 잡아 손님이 낡은 화면을 오래 보지 않게 한다. */
const CACHE = { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" };

// 특정 테마·날짜의 닫힌(예약불가) 시간 조회 — 예약 화면에서 사용
export async function GET(req: NextRequest) {
  /* 🔴 2026-08-14~15 — 요청 한도(하루 10만)를 넘긴 주범이 이 주소였다.
     실측: 한 IP 가 1분에 이 주소를 **120번** 호출(테마 4개 × 날짜 30일 = 120, 즉 달력 전체를
     긁어가는 프로그램). 그 1분 동안 전체 요청의 89% 를 이것이 차지했다.

     ⚠️ **이 제한만으로는 못 막는다.** 클라우드플레어는 요청마다 다른 일꾼(isolate)이 처리할 수
        있어서, 아래 인메모리 계수기에 횟수가 안 쌓인다. 실측으로 75번을 연속으로 보내도
        한 번도 안 걸렸다(2026-08-15).
        같은 일꾼에 몰린 연타만 걸러내는 **보조 장치**로 보고, 실제 방어는 두 가지에 기댄다:
          ① 아래 CACHE — 같은 질문은 30초간 클라우드플레어가 대신 답해 서버가 안 깨어난다
          ② 관문(WAF) 속도 제한 규칙 — 대시보드에서 켜야 한다(토큰 권한이 없어 코드로는 못 켬)
     ⚠️ 다른 공개 주소(예약 접수·조회·후기)에도 같은 방식이 쓰이고 있다. 같은 한계를 갖는다. */
  if (!rateLimit(`slots:${getClientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: "요청이 너무 잦습니다." }, { status: 429 });
  }

  const db = getSupabase();
  if (!db) return NextResponse.json({ blocked: [], dayClosed: false });

  // 만료 예약(30분 미입금) 자동 정리 — 실패해도 조회는 진행
  await sweepExpiredReservations(db).catch(() => {});

  // 전체 미리불러오기 모드(?all=1) — 예약 화면이 열릴 때 앞으로의 모든 날짜·테마의
  // 차단/예약 시간을 한 번에 받아, 손님이 테마·날짜를 고를 때마다 다시 물어보지 않게 한다.
  if (req.nextUrl.searchParams.get("all")) {
    // 어제(KST)부터 — 오늘 지난 시간대는 화면이 알아서 걸러내므로 넉넉히 포함해도 무방.
    const from = new Date(Date.now() + 9 * 3600 * 1000 - 86400000).toISOString().slice(0, 10);
    /* 시간표(어느 시각에 회차가 있는지)도 같이 담는다 — 2026-08-18.
       [왜] 이 응답은 "어디가 찼는지"만 알려준다. 받는 쪽이 "남은 자리"를 계산하려면
            **우리가 몇 시에 운영하는지**를 알아야 하는데, 그건 /api/config 에만 있었다.
            예약 정보를 가져가는 외부 프로그램이 이 주소만 부르고 /api/config 는 안 불러서,
            찬 자리는 알아도 빈 자리를 못 그리는 상태였다(2026-08-18 실측).
       [무엇을] 시간표(timeSlots·themeSlots·storeSlots)와 예약 오픈 규칙만 담는다.
            공지·예약금 같은 나머지 설정은 이 주소와 상관없으므로 넣지 않는다.
            값의 출처는 /api/config 와 같은 getConfig() 하나다 — 두 곳이 어긋날 수 없다.
       ⚠️ 우리 예약 화면은 /api/config 를 따로 부르므로 동작이 달라지지 않는다(그냥 안 쓰는 값이 는다). */
    const [{ data: bs }, { data: rv }, cfg] = await Promise.all([
      db.from("blocked_slots").select("theme_id, date, time").gte("date", from),
      db.from("reservations").select("theme_id, date, time").gte("date", from).neq("status", "cancelled"),
      getConfig(),
    ]);
    return NextResponse.json({
      all: true,
      blockedSlots: bs || [],
      reservations: rv || [],
      // ── 아래부터가 "빈 자리 계산"에 필요한 자료 ──
      timeSlots: cfg.timeSlots,     // 기본 시간표
      themeSlots: cfg.themeSlots,   // 테마별·요일별 시간표 (있으면 이게 우선)
      storeSlots: cfg.storeSlots,   // 매장별·요일별 시간표 (테마 설정 없을 때)
      // 예약창이 언제 열리는지 — 이용일 7일 전 21:00(KST)
      openDaysAhead: RESERVATION_OPEN_DAYS_AHEAD,
      openHourKst: RESERVATION_OPEN_HOUR_KST,
      /* 위 themeSlots 를 **날짜별로 이미 계산해 둔 것**. 받는 쪽이 요일을 직접 따질 필요가 없다.
         { "2026-08-22": { "firstfoundbride": ["10:00", ...], ... }, ... }

         [왜 계산까지 해서 주나] 원본(themeSlots)만 주면 받는 쪽이 세 가지 규칙을 스스로 맞춰야 한다:
           ① 요일은 날짜 문자열 그대로의 요일(0=일 … 6=토)
           ② byDow 에 그 요일이 있으면 그것, 없으면 default
           ③ 테마 시간표 > 매장 시간표 > 전역 시간표 순
         셋 중 하나만 틀려도 엉뚱한 시간표가 나온다. 실제로 이 응답을 만들면서 테스트하다
         요일을 하루 밀려 계산해 **8회차짜리 평일 시간표를 토요일에 적용한 적이 있다**(2026-08-18).
         우리가 쓰는 함수(slotsForThemeDate)로 미리 풀어서 주면 그 실수가 아예 생길 수 없고,
         우리 예약 화면과 **한 글자도 다를 수 없다**(같은 함수를 쓰므로).
         ⚠️ 시간표 규칙이 바뀌어도 이 값은 자동으로 따라간다 — 손댈 필요 없음. */
      scheduleByDate: (() => {
        const out: Record<string, Record<string, string[]>> = {};
        const base = Date.now() + 9 * 3600 * 1000 - 86400000; // 어제(KST)부터
        for (let i = 0; i <= RESERVATION_OPEN_DAYS_AHEAD + 1; i++) {
          const day = new Date(base + i * 86400000).toISOString().slice(0, 10);
          const perTheme: Record<string, string[]> = {};
          for (const t of THEMES) {
            perTheme[t.id] = slotsForThemeDate(cfg.themeSlots, cfg.storeSlots, cfg.timeSlots, t.id, t.store, day);
          }
          out[day] = perTheme;
        }
        return out;
      })(),
    }, { headers: CACHE });
  }

  /* 테마 이름표는 'theme' 이다. 'themeId' 도 같이 받아준다.
     이유: 예약 정보를 가져가는 외부 프로그램이 옛 워드프레스 시절 이름인 'themeId' 로 물어본다.
     이름이 안 맞으니 테마가 빈 값이 되어, **예약이 찬 시간을 하나도 안 알려주고 있었다**
     (8/22 태초의 신부가 10타임 만석인데 저쪽에는 "전부 비어 있음"으로 나갔다 — 2026-08-18 실측).
     그 사이트에 우리 방이 늘 예약 가능으로 떠서 손님이 헛걸음하는 상태였다.
     ⚠️ 우리 화면은 전부 'theme' 을 보내므로 순서상 항상 먼저 잡힌다 — 동작이 달라지지 않는다.
     ⚠️ 요청에 'themeId' 가 붙어 오는 것 자체는 그대로다. 나중에 그 프로그램만 골라내야 할 때
        여전히 같은 방법으로 구분할 수 있다(값을 받아준다고 표시가 사라지지 않는다). */
  const theme =
    req.nextUrl.searchParams.get("theme") ||
    req.nextUrl.searchParams.get("themeId") ||
    "";
  const date = req.nextUrl.searchParams.get("date") || "";
  if (!date) return NextResponse.json({ blocked: [], dayClosed: false });

  // 그 날짜의 차단 슬롯 (테마 일치 또는 테마 무관 전체 차단)
  const { data } = await db
    .from("blocked_slots")
    .select("theme_id, time")
    .eq("date", date);

  const rows = (data || []).filter((b: { theme_id: string | null }) => !b.theme_id || b.theme_id === theme);
  const dayClosed = rows.some((b: { time: string | null }) => !b.time);
  const blocked = rows.filter((b: { time: string | null }) => b.time).map((b: { time: string }) => b.time);

  // 이미 예약된 시간도 불가 처리
  const { data: taken } = await db
    .from("reservations")
    .select("time")
    .eq("theme_id", theme)
    .eq("date", date)
    .neq("status", "cancelled");
  const takenTimes = (taken || []).map((t: { time: string }) => t.time);

  /* 그 테마·그 날짜에 **회차가 몇 시에 있는지**(시간표)도 같이 담는다 — 2026-08-19.

     [왜] 이 응답은 오랫동안 "막힌 시간"만 알려줬다. 받는 쪽이 "남은 자리"를 그리려면
          우리가 몇 시에 운영하는지를 알아야 하는데 그 값이 이 응답에 없었다.
          그래서 예약 정보를 가져가는 외부 프로그램(빠방)의 목록에서
          **우리 매장 세 곳 모두 예약 가능 시간이 빈 채로 들어가 있었다**(2026-08-19 실측:
          그쪽 색인의 reserve_times_d0 ~ d6 이 전부 []). 그쪽은 "남은 시간"이 있는 방만
          목록에 띄우기 때문에, 빈 값이면 우리 방은 아예 안 보인다.
          같은 이유를 ?all=1 응답에서는 이미 해결해 뒀는데(scheduleByDate),
          정작 그 프로그램이 주로 부르는 건 이 테마별 주소였다.

     [무엇을] slots = 그날 회차 전부 · open = 그중 아직 안 막힌 것.
          받는 쪽이 뺄셈을 안 해도 되도록 계산해서 준다.
     ⚠️ 지난 시간은 걸러내지 않는다 — "지금 이후"의 기준은 보는 쪽 시계로 정해야 한다.
     ⚠️ 우리 화면은 이 값을 안 쓴다(/api/config 를 따로 부른다). 늘어난 건 안 쓰는 값뿐. */
  const cfg = await getConfig();
  const slots = slotsForThemeDate(
    cfg.themeSlots, cfg.storeSlots, cfg.timeSlots,
    theme, themeById(theme)?.store, date,
  );
  const closedSet = new Set([...blocked, ...takenTimes]);

  // blocked = 손님 화면이 쓰는 "고를 수 없는 시간" 전부(마감 + 예약참).
  // taken 은 그중 **예약이 차서** 막힌 것만 따로 준다 — 관리자 화면이
  // "마감"과 "예약있음"을 구분해 보여줘야 하기 때문이다(2026-07-31).
  return NextResponse.json({
    dayClosed,
    blocked: Array.from(new Set([...blocked, ...takenTimes])),
    taken: Array.from(new Set(takenTimes)),
    slots,                                                        // 그날 회차 전부
    open: dayClosed ? [] : slots.filter((t) => !closedSet.has(t)), // 남은 자리
  }, { headers: CACHE });
}
