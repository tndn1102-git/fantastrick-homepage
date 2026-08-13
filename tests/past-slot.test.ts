import { describe, it, expect } from "vitest";
import { isPastSlot } from "../src/lib/data";

/* 2026-08-14 — "시작 N분 전 차단"을 없애고 **시작 시각이 되어야만** 막히도록 바꿨다.
   되돌아가는 사고를 막으려고 경계값을 여기에 못 박아 둔다. */

const at = (s: string) => new Date(s).getTime();

describe("예약 잠기는 시점 — 시작 시각", () => {
  const NOW = at("2026-08-14T10:00:00+09:00"); // 한국시간 오전 10시 정각

  it("1분 뒤 시작하는 칸은 예약된다 (전에는 10분 전부터 막혔다)", () => {
    expect(isPastSlot("2026-08-14", "10:01", NOW)).toBe(false);
  });

  it("9분 뒤도 예약된다 — 옛 10분 규칙이 되살아나면 여기서 걸린다", () => {
    expect(isPastSlot("2026-08-14", "10:09", NOW)).toBe(false);
  });

  it("정각(시작하는 그 순간)부터 막힌다", () => {
    expect(isPastSlot("2026-08-14", "10:00", NOW)).toBe(true);
  });

  it("이미 지난 시간은 막힌다", () => {
    expect(isPastSlot("2026-08-14", "09:00", NOW)).toBe(true);
  });

  it("다음 날 칸은 열려 있다", () => {
    expect(isPastSlot("2026-08-15", "10:00", NOW)).toBe(false);
  });

  it("서버가 UTC 로 돌아도 한국시간 기준으로 판단한다", () => {
    // 한국 08-15 00:30 = UTC 08-14 15:30. 이때 08-14 23:00 칸은 이미 지났다.
    const 자정넘김 = at("2026-08-15T00:30:00+09:00");
    expect(isPastSlot("2026-08-14", "23:00", 자정넘김)).toBe(true);
    expect(isPastSlot("2026-08-15", "10:00", 자정넘김)).toBe(false);
  });

  it("날짜·시간이 깨져 있으면 막지 않는다 (다른 검증이 잡는다)", () => {
    expect(isPastSlot("", "10:00", NOW)).toBe(false);
    expect(isPastSlot("2026-08-14", "", NOW)).toBe(false);
    expect(isPastSlot("2026-8-14", "10:00", NOW)).toBe(false);
  });
});
