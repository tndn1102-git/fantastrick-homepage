import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 정적 이미지는 public/ 아래에서 직접 서빙 (외부 도메인 없음)
  reactStrictMode: true,
  /* 🔴 2026-08-16 — 사진 자동 변환을 **끈다**(unoptimized).
   *
   * [왜]
   *   켜져 있으면 손님이 사진을 볼 때마다 `/_next/image` 가 **워커를 깨워서** 그 자리에서
   *   크기를 줄여 준다. 실측 하루 6,700번 — 클라우드플레어 무료 한도(하루 10만 요청)를
   *   갉아먹는 3위였다. 끄면 사진이 **정적 파일**이 되고, 정적 파일 요청은 **공짜·무제한**이다.
   *   (Workers static assets: "Requests to static assets are free and unlimited")
   *
   * [끄기 전에 한 일 — 이게 없으면 끄면 안 된다]
   *   자동 변환이 하던 일을 미리 해 뒀다. `scripts/images-to-webp.mjs` 로 포스터·마스코트·
   *   지도를 화면에 실제로 쓰이는 크기의 webp 로 미리 줄였다(8.6MB → 614KB, -93%).
   *   그래서 손님이 받는 용량은 전과 비슷하다. 원본은 backups/images-원본-20260816 에 있다.
   *
   * ⚠️ 새 사진을 public/images 에 넣을 때는 **미리 줄여서** 넣어야 한다.
   *    큰 파일을 그대로 넣으면 아무도 안 줄여주고 손님이 그 크기 그대로 받는다.
   *    위 스크립트의 PLAN 에 한 줄 추가하고 돌리면 된다. */
  images: { unoptimized: true },
  // 상위 폴더(D:\test3)의 다른 lockfile 을 루트로 잘못 잡지 않도록 이 프로젝트로 고정
  outputFileTracingRoot: import.meta.dirname,
  // 태블릿 앱(BankNotify)이 보내는 주소를 받아준다.
  //   앱은 "설정한주소 + /webhook/deposit" 으로 보내도록 만들어져 있다(PC 서버 시절 주소).
  //   앱을 다시 설치하지 않고도 홈페이지가 받을 수 있게 여기서 진짜 문으로 넘겨준다.
  //   ⚠️ 이 줄을 지우면 이미 설치된 앱이 입금 알림을 못 보낸다 — 앱을 새로 깔기 전엔 지우지 말 것.
  async rewrites() {
    return [
      /* ─── 락다운시티 힌트폰 살리기 (2026-08-13 도메인 이전 직후) ───
         매장 태블릿은 http://fantastrick.co.kr/hint-phone/ 에서 앱을 받는다(원격 재설정 불가).
         도메인이 새 홈페이지로 오면서 이 경로가 사라졌으므로, 옛 가비아 서버로 그대로 통과시킨다.
         old.fantastrick.co.kr = 옛 서버 뒷문(A 211.47.74.37, 이전 때 만들어 둠).
         ⚠️ 이 앱은 매장 내부 ws:// 웹소켓을 쓴다 — 페이지가 https 로 열리면 브라우저가
            비보안 웹소켓을 차단해서 죽는다. 그래서 "항상 https"(always_use_https)를 꺼 두었다.
            힌트폰을 다른 곳으로 옮기기 전에는 다시 켜지 말 것. */
      { source: "/hint-phone", destination: "http://old.fantastrick.co.kr/hint-phone/index.html" },
      { source: "/hint-phone/:path*", destination: "http://old.fantastrick.co.kr/hint-phone/:path*" },
      { source: "/webhook/deposit", destination: "/api/bank/deposit" },
      // 앱이 보내는 진단 기록(감시 서비스 생존·화면 읽기 결과)도 같은 방식으로 받는다.
      { source: "/webhook/diag", destination: "/api/bank/diag" },
    ];
  },
  /* ─── 옛 워드프레스 주소 받아주기 (도메인 이전 준비 · 2026-08-12) ───
     검색 결과·블로그·즐겨찾기에는 옛 사이트 주소가 남아 있다. 도메인을 옮긴 뒤
     그 주소로 들어온 손님이 "페이지 없음"을 보지 않도록 새 자리로 넘겨준다.
     옛 주소는 실제 옛 사이트를 긁어서 확인한 것들이다.
     · /rooms/{id} 는 옛/새 구조가 같아서 넘길 필요가 없다(운 좋게 그대로 이어진다).
     · 301(영구이동)이라 검색엔진도 새 주소로 옮겨 배운다. */
  async redirects() {
    return [
      /* /booking 은 여기서 넘기지 않는다 — src/app/booking/route.ts 가 직접 답한다.
         손님은 그대로 /reserve 로 넘어가고, 외부 수집기에게는 옛 워드프레스 모양으로 답한다.
         (여기 두면 라우트까지 도달하지 못한다 — redirects 가 먼저 돌기 때문) */
      { source: "/faqs", destination: "/faq", permanent: true },          // 자주 묻는 질문
      { source: "/policy", destination: "/privacy", permanent: true },    // 개인정보 취급방침
      { source: "/contacts", destination: "/business", permanent: true }, // 컨설팅 문의 → B2B
      /* 🔴 2026-08-15 — 워드프레스 주소(wp-admin·wp-login)를 홈으로 넘기던 두 줄을 **뺐다.**
         이 설정(redirects)이 middleware 보다 먼저 돌아서, 로봇이 두드릴 때마다
         "홈으로 가라"고 답하고 → 로봇이 홈까지 또 부른다(요청 2배).
         지금은 middleware.ts 가 404 한 줄로 끊는다. 사람은 이 주소를 칠 일이 없다. */
      { source: "/feed", destination: "/", permanent: true },

      /* ─── 매장 QR(히든페이지) 살리기 (2026-08-13) ───
         방 안 소품에 인쇄된 QR 이라 주소를 바꿀 수 없다. 원래는 워드프레스 페이지가
         받아서 JS 로 다시 넘기는 2단 구조였는데, 그 최종 목적지 파일이 옛 서버에서
         이미 사라져 있었다(FTP 확인: /210823.html 없음, /Hiddenpage2nd/ 없음).
           · /05ev17 = "QR 코드 페이지"  → 옛 목적지 /210823.html
           · /03ev28 = "Hidden2nd"      → 옛 목적지 /Hiddenpage2nd/BookOfDuat.html
         같은 내용이 fantastrickside 서버에 살아 있으므로 그쪽으로 넘긴다.
         지점↔테마는 확정: 1호점=태초의 신부, 2호점=사자의 서(=Book of Duat).
         ⚠️ 302(임시)로 둔다 — 인쇄물이라 나중에 목적지를 또 옮길 수 있는데,
            301 로 박으면 손님 폰에 옛 목적지가 캐시로 눌러앉는다. */
      { source: "/05ev17", destination: "https://fantastrickside.gabia.io/hidden-page-first/", permanent: false },
      { source: "/03ev28", destination: "https://fantastrickside.gabia.io/hidden-page-second/", permanent: false },
    ];
  },
  // 모든 경로에 기본 보안 헤더 적용 (클릭재킹·MIME 스니핑·정보 유출 1차 방어)
  async headers() {
    return [
      // 포스터·로고 같은 그림: 손님 폰에 하루 보관 → 그날 다시 와도 다시 안 받는다.
      //   하루가 지나면 "일단 옛 그림을 바로 보여주고(=안 느림), 뒤에서 몰래 새로 받아둔다"
      //   (stale-while-revalidate). 그래서 포스터를 같은 이름으로 갈아끼워도 **하루 안에** 반영된다.
      //   ⚠️ 여기서 max-age 를 1년으로 박으면 빨라지긴 하지만, 포스터를 바꿔도 이미 방문한
      //      손님 폰에는 **1년 내내 옛 포스터**가 남는다. 그래서 일부러 하루로 잡았다.
      //   ※ /_next/image 로 자동 변환된 그림도 이 원본의 값을 그대로 물려받으므로 같이 해결된다.
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=2592000",
          },
        ],
      },
      // 글꼴: 그림보다 훨씬 안 바뀌므로 30일. 바꿀 일이 생기면 파일 이름을 바꾸면 즉시 반영된다.
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=31536000",
          },
        ],
      },
      /* 🔴 2026-08-14 — 관리자 화면은 **절대 캐시하지 않는다.**
       *
       * [무슨 일이 있었나]
       *   폰에서 관리자에 들어가면 "화면을 불러오지 못했어요"가 떴다.
       *   원인은 응답 헤더가 `Cache-Control: s-maxage=31536000` (**1년**) 이었던 것 —
       *   Cloudflare 가 관리자 화면(HTML)을 1년치로 붙들고 있었다.
       *   배포를 하면 화면이 찾는 부품(js/css) 파일 이름이 바뀌는데, 캐시된 옛 화면은
       *   **이미 사라진 옛 부품**을 찾다가 터진다. 새로고침해도 같은 옛 화면이 다시 와서
       *   자가 치유(error.tsx 의 자동 새로고침)도 소용이 없었다.
       *   오늘 하루 종일 "Ctrl+F5 해야 반영된다"던 것도 전부 이것 때문이다.
       *
       * [왜 관리자만인가]
       *   손님 화면은 캐시가 있어야 빠르다(같은 화면을 수천 명이 본다).
       *   관리자는 사장님 한 사람이 보는 **매번 달라지는 화면**이라 캐시 이득이 없고,
       *   오히려 옛 화면이 남는 손해만 크다.
       *
       * ⚠️ 이 규칙을 지우면 배포할 때마다 관리자가 터진다. 손대지 말 것. */
      {
        source: "/admin/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }],
      },
      {
        source: "/admin",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(), camera=(), microphone=()" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;

// Cloudflare(OpenNext) 로컬 개발용 바인딩 초기화 — Vercel/일반 dev 엔 영향 없음.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
