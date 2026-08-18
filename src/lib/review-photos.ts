/* 후기에 붙는 사진 — 원문 주소를 열쇠로 이어 붙인다.
 *
 * [왜 표(DB)가 아니라 여기인가]
 *   사진은 **사람이 눈으로 보고 골라야 한다.** 블로그 글에 있는 사진 중에는
 *   같이 간 손님이 찍힌 단체사진(초상권), 블로거 본인 캐릭터(그분 저작물),
 *   가격표·안내판처럼 후기와 무관한 것이 섞여 있다.
 *   자동으로 아무 사진이나 끌어오면 그 셋을 그대로 올리게 된다 —
 *   실제로 후보를 뽑아보니 4장 중 3장이 그런 사진이었다(2026-08-18).
 *   그래서 **고르는 일은 자동화하지 않는다.** 여기에 손으로 적는 것이 곧 검토 기록이다.
 *
 * [사진 넣는 순서]
 *   ① 블로거에게 **글과 사진 둘 다** 써도 되는지 동의를 받는다.
 *   ② `node scripts/blog-photos.mjs <블로그주소>` 로 후보를 내려받아 눈으로 본다.
 *   ③ 사람이 안 찍힌 사진 1~2장을 고른다(테마 굿즈·기록 보드·매장 입구 등).
 *   ④ 900px webp 로 줄여 public/images/reviews/ 에 넣는다.
 *      ⚠️ 사진 자동 변환을 꺼둔 상태라 **미리 줄여야 한다**(next.config.ts 주석).
 *   ⑤ 아래 목록에 한 줄 적고 배포한다.
 *
 * ⚠️ 단체사진은 쓰지 않는다. 글쓴이 한 분의 동의로는 같이 찍힌 분들을 담을 수 없다.
 */
export type ReviewPhoto = { src: string; alt: string };

export const REVIEW_PHOTOS: Record<string, ReviewPhoto[]> = {
  "https://blog.naver.com/kumo_escape/224307207955": [
    { src: "/images/reviews/kumo-ldc-1.webp", alt: "락다운시티 NERC 인식표 기념품" },
  ],
  "https://blog.naver.com/wishgodlife/224374621031": [
    { src: "/images/reviews/gaemi-ldc-1.webp", alt: "락다운시티 탈출 기록 보드" },
    { src: "/images/reviews/gaemi-ldc-2.webp", alt: "판타스트릭 TGC 입구" },
  ],
};

/** 그 후기에 붙는 사진들. 없으면 빈 배열. */
export function photosFor(sourceUrl?: string | null): ReviewPhoto[] {
  if (!sourceUrl) return [];
  return REVIEW_PHOTOS[sourceUrl] || [];
}
