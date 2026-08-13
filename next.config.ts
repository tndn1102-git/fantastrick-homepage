import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 정적 이미지는 public/ 아래에서 직접 서빙 (외부 도메인 없음)
  reactStrictMode: true,
  // ⚠️ minimumCacheTTL 은 "**Vercel 서버**가 최적화된 이미지를 얼마나 보관할지"만 정한다.
  //    손님 폰(브라우저)이 얼마나 보관할지는 **원본 파일의 Cache-Control 을 그대로 물려받는다**.
  //    그래서 이것만으로는 재방문 때마다 포스터를 다시 받는 문제가 안 고쳐진다
  //    (2차 점검 실측: x-vercel-cache: HIT 인데 손님에게 가는 값은 max-age=0).
  //    → 실제 해결은 아래 headers() 의 /images, /fonts 규칙이다. 이건 서버 보관용으로 유지.
  images: { minimumCacheTTL: 60 * 60 * 24 * 30 },
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
      { source: "/booking", destination: "/reserve", permanent: true },   // 예약하기
      { source: "/faqs", destination: "/faq", permanent: true },          // 자주 묻는 질문
      { source: "/policy", destination: "/privacy", permanent: true },    // 개인정보 취급방침
      { source: "/contacts", destination: "/business", permanent: true }, // 컨설팅 문의 → B2B
      // 워드프레스 시스템 주소들 — 새 사이트엔 없는 개념이라 홈으로.
      { source: "/wp-admin/:path*", destination: "/", permanent: true },
      { source: "/wp-login.php", destination: "/", permanent: true },
      { source: "/feed", destination: "/", permanent: true },
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
