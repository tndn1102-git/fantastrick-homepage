-- 판타스트릭 — 블로그 후기 공유를 위한 표 손질 (2026-08-11)
--
-- 왜 필요한가
--   손님이 네이버 블로그에 써주신 후기를, 작성자 동의를 받고 출처를 밝혀 사이트에 옮긴다.
--   지금 표에는 출처를 적을 칸이 "source" 하나뿐인데 20자짜리 글자 칸이라 주소가 안 들어간다.
--   그래서 "네이버 블로그" 라는 글자만 뜨고 손님이 눌러서 원문으로 갈 수가 없다.
--
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 [Run]

-- 1) 원문 주소. 화면에서 출처를 눌러 원글로 갈 수 있게 한다.
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS source_url text;

-- 2) 동의 기록. 화면에는 안 보이고 관리자만 본다.
--    나중에 작성자가 내려달라고 하거나 문제가 생겼을 때 "언제 어떻게 동의를 받았는지"가 증빙이 된다.
--    기억은 사라지지만 기록은 남는다.
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS consent_note text;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS consent_at   timestamptz;

-- 3) 별점을 비워둘 수 있게 한다.
--    블로그 글에는 별점이 없다. 없는 점수를 우리가 지어내면 손님을 속이는 것이 된다.
--    → 외부 후기는 별점 없이 싣고, 화면에서도 별을 그리지 않는다.
--    ⚠️ 기존 후기의 별점은 그대로 남는다. NOT NULL 만 푸는 것이라 지워지지 않는다.
--    (1~5 범위 검사는 그대로 살아 있다. 값이 비어 있으면 검사를 건너뛴다.)
ALTER TABLE reviews ALTER COLUMN rating DROP NOT NULL;

-- 4) 외부 후기는 작성자 전화번호를 모른다. 지금은 빈 문자열을 넣고 있는데,
--    "모른다" 와 "빈 값" 은 다르므로 비워둘 수 있게 한다.
ALTER TABLE reviews ALTER COLUMN phone DROP NOT NULL;

-- 확인용 — 실행 후 이 줄만 따로 돌려보면 칸이 잘 생겼는지 보인다.
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
--  WHERE table_name = 'reviews' ORDER BY ordinal_position;
