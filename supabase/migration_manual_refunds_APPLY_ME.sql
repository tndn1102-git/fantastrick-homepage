-- ============================================================
-- 매장 수동 환불 접수 표 (2026-08-15)
--
-- 왜 만드나:
--   지금 [환불 처리] 탭에는 **홈페이지에서 취소된 예약**만 뜬다. 그런데 실제로는
--   매장에서 손님을 직접 응대하다 환불해줘야 하는 경우가 있다(현장 취소, 착오 입금,
--   중복 결제 등). 그건 어디에도 안 남아서 직원이 사장님께 따로 말로 전해야 했다.
--   → 현장 직원이 여기에 적어두면, 사장님이 [환불 처리] 탭에서 한 번에 보고 보낸다.
--
-- 무엇이 들어오나:
--   name    손님 이름 (필수)
--   amount  환불 금액(원) (필수)
--   bank    은행 (필수)
--   account 계좌번호 (필수)
--   holder  예금주 (필수)
--   reason  환불 사유 (필수 — 사장님이 판단하려면 이유가 있어야 한다)
--   staff   접수한 직원 (선택 — 나중에 물어볼 사람)
--   status  pending(보낼 것) → done(보냄) / cancelled(취소)
--   memo    사장님 메모
--
-- ⚠️ 예약(reservations)과 FK 로 잇지 않는다. 예약 없이 생기는 환불도 있고,
--    두 표 사이 FK 가 늘면 PostgREST embed 가 ambiguous 로 빈 배열을 준다.
--
-- 적용 방법: Supabase → SQL Editor → 아래 전체 붙여넣고 Run
-- 안전합니다: 새 표 하나를 만들 뿐, 기존 자료는 건드리지 않습니다.
-- ============================================================

create table if not exists public.manual_refunds (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  amount     int  not null,
  bank       text not null,
  account    text not null,
  holder     text not null,
  reason     text not null,
  staff      text,
  status     text not null default 'pending',
  memo       text,
  created_at timestamptz not null default now(),
  done_at    timestamptz
);

-- 목록은 항상 최신순
create index if not exists idx_mrf_created on public.manual_refunds (created_at desc);
-- 뱃지("보낼 환불 N건")가 세는 조건
create index if not exists idx_mrf_status  on public.manual_refunds (status);

-- 보안: 예약·입금 표와 동일하게 서버(Service Role 키)로만 접근한다.
alter table public.manual_refunds enable row level security;

-- 확인용 (실행하면 칸 목록이 나오면 성공)
select column_name, data_type from information_schema.columns
where table_name = 'manual_refunds' order by ordinal_position;
