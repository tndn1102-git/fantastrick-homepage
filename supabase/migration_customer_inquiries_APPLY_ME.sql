-- ============================================================
-- 손님 1:1 문의 표 (2026-08-13)
--
-- 왜 만드나:
--   챗봇 오른쪽 아래에서 "1:1 문의 남기기"를 누르면 손님이 글을 남긴다.
--   전에는 카카오톡·문자 버튼으로 밖으로 내보냈는데, 그러면
--   ① 사장님이 폰 여러 곳(카톡·문자)을 돌아다니며 확인해야 하고
--   ② 답을 했는지 안 했는지 기록이 안 남는다.
--   → 홈페이지 안에 쌓고, 관리자 › 문의 탭에서 확인·답변하도록 옮긴다.
--
-- 무엇이 들어오나:
--   name     이름 (필수)
--   phone    연락처 (필수, 숫자만 저장 — 예약과 같은 방식)
--   message  문의 내용 (필수)
--   status   new(새 문의) → answered(답변 남김) → done(끝)
--   reply    사장님이 쓴 답변
--
-- ⚠️ 예약(reservations)과 FK로 잇지 않는다. 문의한 사람이 꼭 예약자인 것도 아니고,
--    두 표 사이에 FK가 늘면 PostgREST embed 가 ambiguous 로 빈 배열을 준다.
-- ⚠️ 이름이 biz_inquiries(B2B 도입 문의)와 비슷하지만 **다른 표**다. 섞지 말 것.
--
-- 적용 방법: Supabase → SQL Editor → 아래 전체 붙여넣고 Run
-- 안전합니다: 새 표 하나를 만들 뿐, 기존 예약·입금 자료는 건드리지 않습니다.
-- ============================================================

create table if not exists public.customer_inquiries (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text not null,
  message     text not null,
  status      text not null default 'new',
  reply       text,
  replied_at  timestamptz,
  admin_note  text,
  created_at  timestamptz not null default now()
);

-- 목록은 항상 최신순으로 본다
create index if not exists idx_cus_inq_created on public.customer_inquiries (created_at desc);
-- 관리자 뱃지("아직 답 안 한 문의 N건")가 매번 세는 조건
create index if not exists idx_cus_inq_status  on public.customer_inquiries (status);

-- 보안: 예약·입금 표와 동일하게 서버(Service Role 키)로만 접근한다.
-- 공개 정책을 두지 않으므로 손님 브라우저에서는 직접 읽을 수 없다.
alter table public.customer_inquiries enable row level security;

-- 확인용 (실행하면 칸 목록이 나오면 성공)
select column_name, data_type from information_schema.columns
where table_name = 'customer_inquiries' order by ordinal_position;
