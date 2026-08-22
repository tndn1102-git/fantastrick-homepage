import type { MetadataRoute } from "next";
import { THEMES } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

/* 검색엔진에게 "우리 사이트에 이런 페이지들이 있다"고 알려주는 지도.
   도메인 이전 뒤 네이버·구글 서치콘솔에 이 주소(/sitemap.xml)를 제출한다. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: "", priority: 1.0 },          // 홈
    { path: "/reserve", priority: 0.9 },  // 예약 — 손님이 제일 많이 찾는 곳
    { path: "/rooms", priority: 0.8 },    // (테마 상세는 아래에서 개별 추가)
    { path: "/reviews", priority: 0.7 },
    { path: "/about", priority: 0.6 },
    { path: "/universe", priority: 0.6 },  // 사자의 서 세계관 아카이브
    { path: "/events", priority: 0.6 },
    { path: "/faq", priority: 0.5 },
    { path: "/business", priority: 0.5 },
    { path: "/business/collab", priority: 0.4 },
    { path: "/reservation", priority: 0.4 }, // 예약 조회·취소
    { path: "/privacy", priority: 0.2 },
  ];
  return [
    ...pages
      .filter((p) => p.path !== "/rooms") // /rooms 목록 페이지는 없다(상세만 있음)
      .map((p) => ({ url: `${SITE_URL}${p.path}`, priority: p.priority })),
    // 테마 상세 — 운영 중 4개. 준비 중(SOON_THEMES)은 내용이 비어 있어 넣지 않는다.
    ...THEMES.map((t) => ({ url: `${SITE_URL}/rooms/${t.id}`, priority: 0.8 })),
  ];
}
