import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/* 검색엔진에게 "어디는 읽고 어디는 읽지 말라"를 알려주는 파일.
   지금까지 없었다 — 없으면 전부 허용이라 관리자 화면 주소까지 검색에 실릴 수 있다. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 손님용이 아닌 화면들. 검색에 나오면 안 되는 곳.
      disallow: ["/admin", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
