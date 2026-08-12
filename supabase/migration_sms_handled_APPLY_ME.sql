-- 판타스트릭 — "카톡 못 받은 손님" 처리 표시 (2026-08-12)
--
-- 왜 필요한가
--   문자 발신번호 심사가 끝날 때까지는 알림톡(카카오톡)으로만 안내가 나간다.
--   카카오톡을 안 쓰는 손님에게는 안내가 못 가므로, 그 명단을 관리자 화면에 띄우고
--   사장님이 직접 연락한다. 그때 **"이 사람은 이미 연락했다"** 를 표시할 칸이 필요하다.
--   표시가 없으면 목록이 줄지 않아서, 누구에게 연락했는지 매번 기억에 의존하게 된다.
--
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 [Run]

ALTER TABLE sms_log ADD COLUMN IF NOT EXISTS handled_at timestamptz;

-- 아직 처리 안 한 건만 빠르게 찾기 위한 색인.
-- 조건부 색인이라 처리 끝난 기록은 색인에서 빠진다 — 목록이 계속 가벼운 이유다.
CREATE INDEX IF NOT EXISTS idx_smslog_unhandled
  ON sms_log (created_at DESC)
  WHERE handled_at IS NULL;

-- 확인용 — 실행 후 이 줄만 따로 돌려보면 칸이 생겼는지 보인다.
-- SELECT column_name, data_type FROM information_schema.columns
--  WHERE table_name = 'sms_log' ORDER BY ordinal_position;
