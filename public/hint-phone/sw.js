// 서비스 워커 - 오프라인 지원
// 버전을 변경하면 캐시가 자동으로 업데이트됩니다
// rev: 2026-08-05a (v143 — 사고 재시작은 아무것도 지우지 않음 · 종료 신호 폰끼리 공유 · 버전 보고)
// ⚠ 이 서비스워커는 **어디에서도 register 되지 않는다**(index.html·script.js 확인, v129~v143).
//    즉 지금은 동작하지 않는 파일이다. 캐시 갱신은 index.html 의 ?v= 캐시버스트가 전담한다.
//    등록하려면 캐시 전략부터 network-first 로 바꿔야 한다 — 지금 코드(cache-first + index.html
//    프리캐시)를 그대로 켜면 새로고침 한 번으로는 최신 파일이 안 내려온다.
const CACHE_VERSION = new Date().getTime(); // 타임스탬프로 자동 버전 관리
const CACHE_NAME = `fantastrick-hint-phone-v${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/img/page-start.png',
  '/img/background.png',
  '/sound/mission.mp3'
];

self.addEventListener('install', event => {
  console.log('Service Worker 설치 중, 캐시 버전:', CACHE_NAME);
  // 즉시 활성화
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker 활성화됨, 이전 캐시 삭제 중...');
  
  // 이전 버전의 캐시를 모두 삭제
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName.startsWith('fantastrick-hint-phone-v') && cacheName !== CACHE_NAME) {
            console.log('이전 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // 모든 클라이언트를 즉시 제어
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 캐시에 있으면 캐시에서, 없으면 네트워크에서
        return response || fetch(event.request);
      })
      .catch(error => {
        console.error('Fetch 실패:', error);
      })
  );
});