/* 네이버 서치어드바이저 소유확인 파일 (도메인 이전 준비 · 2026-08-12)
 *
 * 옛 사이트 루트에 있던 파일을 그대로 옮긴 것. 도메인을 옮긴 뒤에도
 * 네이버 검색 등록이 유지되려면 이 파일이 같은 주소에서 계속 응답해야 한다.
 *
 * ⚠️ public/ 에 두면 안 되는 이유 — 정적 파일 서버가 .html 주소를
 *    확장자 없는 주소로 307 리다이렉트한다(실측). 네이버 검증 로봇이
 *    리다이렉트를 안 따라가면 소유확인이 풀린다. 그래서 라우트로 직접 200을 준다. */
export function GET() {
  return new Response("naver-site-verification: naver177d824511d907c39cd1afff10e89d47.html", {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
