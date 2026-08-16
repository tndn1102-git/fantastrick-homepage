/* 예약금 입금 계좌 — **이 파일 하나가 유일한 출처**다.
 *
 * 쓰는 곳 셋:
 *   ① 예약하기(/reserve) 접수 직후 [예약금 입금 안내] 팝업
 *   ② 예약조회(/reservation) 미입금 예약 칸
 *   ③ 챗봇 [예약금 입금 계좌]
 * 계좌가 바뀌면 여기만 고치면 세 곳이 같이 바뀐다.
 *
 * ⚠️ 화면 부품(components/DepositPay.tsx)이 아니라 여기(lib)에 둔 이유:
 *    DepositPay 는 QR 만드는 라이브러리(qrcode)를 들고 있다. 챗봇처럼 계좌 "글자"만
 *    필요한 곳이 그걸 import 하면 쓰지도 않는 QR 코드가 같이 실려 나간다.
 */
export const PAY_BANK = "카카오뱅크";
export const PAY_ACCT = "3333-09-7175706";   // 화면 표시용(하이픈 있음)
export const PAY_ACCT_NO = "3333097175706";  // 복사·딥링크용(숫자만)
export const PAY_HOLDER = "승현수";

// 토스 송금 딥링크 — 앱이 받는 계좌·금액을 미리 채운 송금화면으로 열린다(모바일 전용).
export const tossSendLink = (amount: number) =>
  `supertoss://send?bank=${encodeURIComponent(PAY_BANK)}&accountNo=${PAY_ACCT_NO}&amount=${amount}&origin=link`;
