/* 블로그에서 옮겨온 후기 글을 **읽기 좋은 문단으로 다시 묶는다.**
 *
 * [왜 필요한가]
 *   블로그, 특히 모바일로 쓴 글은 화면 폭에 맞춰 **문장 중간에서 줄을 끊는다.**
 *     "... 플레이 하는 동선을 잘 짜놔서 되게
 *      넓어보이게끔 했더라구요!
 *      또 맨 밑에 정리하는 글에도 보이겠지만 이 테마가
 *      코스튬을 입고
 *      플레이를 할 수도 있는데, ..."
 *   원문 폭에서는 자연스럽지만 우리 화면 폭은 다르다. 그대로 두면 위처럼 들쭉날쭉해
 *   읽기 힘들다(2026-08-18 사장님 지적).
 *
 * [무엇을 하나]
 *   문장이 끝나지 않은 채 끊긴 줄은 **다음 줄과 도로 붙인다.** 문장이 끝난 자리에서만 줄을 바꾼다.
 *   빈 줄은 문단 나눔으로 살린다.
 *
 * ⚠️ 글자를 바꾸지 않는다 — 붙이고 나누기만 한다. 맞춤법·표현은 원문 그대로 둔다.
 * ⚠️ 목록 줄(- · ※ 【 등)은 붙이지 않는다. 붙이면 항목이 한 덩어리가 된다.
 */

/** 이 줄에서 문장이 끝났는가 */
function endsSentence(line: string): boolean {
  const s = line.replace(/["'”’)\]】」…\s]+$/u, "");           // 닫는 따옴표·괄호는 걷어내고 본다
  if (/[.!?~]$/.test(s)) return true;                          // 마침표·느낌표·물음표·물결
  if (/[가-힣]$/.test(s) && /(다|요|죠|네|군|까|나|져|함|음|임|것|중)$/.test(s)) return true; // 한국어 종결
  if (/[:：]$/.test(s)) return true;                            // "연출 :" 처럼 뒤에 이어질 자리
  if (/\p{Extended_Pictographic}$/u.test(s)) return true;       // 이모지로 끝나면 문장 끝으로 본다
  return false;
}

/** 이 줄은 목록·제목이라 앞줄에 붙이면 안 되는가 */
function isMarker(line: string): boolean {
  return /^[-–—·•※▶▪◆□■☆★>]|^【|^\[|^\(?\d+[.)]\s|^#/u.test(line.trim());
}

/** 후기 본문 → 문단 배열. 화면에서는 문단마다 <p> 로 그린다. */
export function toParagraphs(raw: string): string[] {
  const lines = String(raw || "").replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim());

  const paras: string[] = [];
  let cur = "";
  const flush = () => { if (cur.trim()) paras.push(cur.trim()); cur = ""; };

  for (const line of lines) {
    if (!line) { flush(); continue; }                 // 빈 줄 = 문단 나눔
    if (!cur) { cur = line; continue; }
    // 앞줄이 문장으로 끝났거나, 이 줄이 목록 표시면 → 새 줄로 시작
    if (endsSentence(cur) || isMarker(line) || isMarker(cur)) { flush(); cur = line; continue; }
    cur += " " + line;                                 // 문장이 이어지는 중 → 도로 붙인다
  }
  flush();
  return paras;
}

/** 카드 미리보기처럼 한 덩어리 글이 필요할 때 */
export function toReadableText(raw: string): string {
  return toParagraphs(raw).join("\n");
}
