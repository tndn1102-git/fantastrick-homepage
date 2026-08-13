import { describe, it, expect } from "vitest";
import { findBalanceMatch, kstDatesAround, playStartMs } from "../src/lib/bank/balance";

// 입금 시각 = 2026-08-13 18:33 (한국)
const RECV = new Date("2026-08-13T18:33:00+09:00").getTime();

const 김혜진 = { id: "r1", name: "김혜진", theme_name: "태초의 신부", date: "2026-08-13", time: "18:40" };

describe("현장 잔금 판별", () => {
  it("실제 사례 — 플레이 7분 전 입금은 잔금으로 본다", () => {
    const m = findBalanceMatch("김혜진", RECV, [김혜진]);
    expect(m?.reservation.id).toBe("r1");
    expect(m?.minutesToPlay).toBe(7);
  });

  it("이름이 다르면 안 잡는다", () => {
    expect(findBalanceMatch("김헤진", RECV, [김혜진])).toBeNull();
  });

  it("앞뒤 1시간을 넘으면 안 잡는다 — 며칠 전 낸 예약금이 잔금으로 오해되면 안 된다", () => {
    const 다음날 = { ...김혜진, date: "2026-08-14" };
    expect(findBalanceMatch("김혜진", RECV, [다음날])).toBeNull();
  });

  it("경계 — 정확히 1시간 전은 잡고, 1시간 1분 전은 안 잡는다", () => {
    const 한시간뒤 = { ...김혜진, time: "19:33" };
    const 한시간1분뒤 = { ...김혜진, time: "19:34" };
    expect(findBalanceMatch("김혜진", RECV, [한시간뒤])).not.toBeNull();
    expect(findBalanceMatch("김혜진", RECV, [한시간1분뒤])).toBeNull();
  });

  it("플레이가 시작된 뒤에 낸 것도 잔금이다 (음수 분)", () => {
    const 아까시작 = { ...김혜진, time: "18:00" };
    const m = findBalanceMatch("김혜진", RECV, [아까시작]);
    expect(m?.minutesToPlay).toBe(-33);
  });

  it("같은 이름 확정 예약이 둘이면 시각이 더 가까운 쪽을 고르고 건수를 알린다", () => {
    const 가까움 = { ...김혜진, id: "가", time: "18:40" };
    const 멂 = { ...김혜진, id: "나", time: "19:30" };
    const m = findBalanceMatch("김혜진", RECV, [멂, 가까움]);
    expect(m?.reservation.id).toBe("가");
    expect(m?.total).toBe(2);
  });

  it("이름 공백은 무시한다", () => {
    expect(findBalanceMatch("김 혜 진", RECV, [김혜진])).not.toBeNull();
  });

  it("훑을 날짜는 어제·오늘·내일 (한국 날짜)", () => {
    expect(kstDatesAround(RECV)).toEqual(["2026-08-12", "2026-08-13", "2026-08-14"]);
  });

  it("자정 직후 입금도 전날 예약을 볼 수 있다", () => {
    const 자정15분 = new Date("2026-08-14T00:15:00+09:00").getTime();
    const 어제23시40분 = { ...김혜진, date: "2026-08-13", time: "23:40" };
    expect(kstDatesAround(자정15분)).toContain("2026-08-13");
    expect(findBalanceMatch("김혜진", 자정15분, [어제23시40분])).not.toBeNull();
  });

  it("날짜·시각이 깨져 있으면 조용히 넘어간다", () => {
    expect(Number.isNaN(playStartMs("", ""))).toBe(true);
    expect(findBalanceMatch("김혜진", RECV, [{ ...김혜진, time: "" }])).toBeNull();
  });
});
