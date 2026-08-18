/* ─── 네이버 블로그 후기 자동 수집 (2026-08-11) ────────────────────────────
 *
 * 사장님이 **주소만 붙여넣으면** 나머지를 전부 알아서 채운다.
 *   주소 → 본문 읽기 → 작성자·작성일 뽑기 → 테마 알아내기 → 발췌 만들기
 *
 * [⚠️ 네이버 블로그의 함정 — 주소를 그대로 부르면 본문이 없다]
 *   blog.naver.com/{아이디}/{글번호} 를 열면 껍데기만 오고 본문은 iframe 안에 따로 있다.
 *   그래서 **m.blog.naver.com(모바일)** 주소로 바꿔 부른다. 여기엔 본문이 그대로 들어 있다.
 *   모바일이 막히면 PostView 주소로 한 번 더 시도한다.
 *
 * [저작권]
 *   작성자 동의를 받고 옮기더라도 **전문을 복사하지 않는다.**
 *   글 전체를 옮기면 원글로 갈 이유가 사라져, 써주신 분의 방문을 우리가 가져가는 모양이 된다.
 *   → 발췌 + 원문 링크가 원칙이다. EXCERPT_MAX 가 그 상한이다.
 *   2026-08-18 — 400 → 800 자로 올렸다(사장님 요청: 너무 짧아 보인다).
 *   실측 원문이 3,400~4,300자라 800자는 **원문의 20% 안쪽**이다. 발췌라는 성격은 그대로 유지된다.
 *   ⚠️ 더 올리지 말 것. 원문의 3분의 1을 넘어가면 '옮겨 실었다'에 가까워지고,
 *      써주신 분이 받을 방문을 우리가 가져가는 모양이 된다.
 */
import { THEMES } from "./data";

export type BlogDraft = {
  ok: boolean;
  error?: string;
  url?: string;          // 정규화한 원문 주소 (사람이 열어도 되는 형태)
  author?: string;       // 블로그 닉네임
  postedAt?: string;     // 원글 작성일 (YYYY-MM-DD)
  themeId?: string;
  themeName?: string;
  excerpt?: string;      // 발췌 본문
  title?: string;
  matchedBy?: string;    // 테마를 무엇을 보고 골랐는지 (사람이 검증할 수 있게)
  fullLength?: number;   // 원문 길이 — 얼마나 잘라냈는지 가늠용
};

const EXCERPT_MAX = 800;

/** 주소에서 블로그 아이디와 글 번호를 뽑는다. 사람들이 붙여넣는 온갖 형태를 받아준다. */
export function parseNaverUrl(raw: string): { blogId: string; logNo: string } | null {
  let s = raw.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;

  let u: URL;
  try { u = new URL(s); } catch { return null; }
  if (!/(^|\.)blog\.naver\.com$/i.test(u.hostname) && !/(^|\.)naver\.me$/i.test(u.hostname)) return null;

  // ① PostView 형태 — ?blogId=xxx&logNo=123
  const qId = u.searchParams.get("blogId");
  const qNo = u.searchParams.get("logNo");
  if (qId && qNo) return { blogId: qId, logNo: qNo };

  // ② 일반 형태 — /아이디/글번호
  const seg = u.pathname.split("/").filter(Boolean);
  if (seg.length >= 2 && /^\d+$/.test(seg[1])) return { blogId: seg[0], logNo: seg[1] };

  return null;
}

/** HTML 에서 글자만 남긴다. 줄바꿈은 살려야 문단이 뭉개지지 않는다. */
function toText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    // 숫자·16진수 기호(&#39; &#x27; 따위)도 글자로 바꾼다. 안 그러면 손님 화면에 &#x27; 가 그대로 보인다.
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    // &amp; 는 **맨 마지막에** 푼다. 먼저 풀면 &amp;#x27; 이 &#x27; 로 바뀐 뒤 위 규칙을 못 만난다.
    .replace(/&amp;/g, "&")
    .replace(/[ \t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n").map((l) => l.trim()).join("\n")
    .trim();
}

/**
 * 본문 글자만 뽑는다.
 *
 * [⚠️ 왜 "본문 div 를 통째로 잘라내기" 가 아닌가 — 2026-08-11 실제로 깨져서 고침]
 *   처음엔 se-main-container div 를 정규식으로 잘라냈다. 그런데 네이버 본문은 div 가
 *   수십 겹으로 겹쳐 있어서, 정규식이 **첫 </div> 에서 멈춰 1,660자만** 집어왔다.
 *   (실제 후기 글이 3,375자였는데 본문을 못 찾았다고 실패했다.)
 *   div 짝을 정규식으로 맞추는 건 원리상 불가능하다 — 겹친 만큼 셀 줄 알아야 한다.
 *
 * → 그래서 **문단 태그를 하나씩 줍는다.** 스마트에디터는 문단마다
 *   <p class="se-text-paragraph"> 를 붙이므로, 겹침을 셀 필요가 없다.
 *   구버전 에디터(se-text-paragraph 없음)를 위해 옛 방식도 남겨둔다.
 */
function pickBodyText(html: string): string {
  const paras = [...html.matchAll(/<p[^>]*class="[^"]*se-text-paragraph[^"]*"[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => toText(m[1]))
    .filter(Boolean);

  if (paras.length >= 3) return paras.join("\n");

  // 옛 에디터 — 본문 영역이 하나의 덩어리로 있다.
  for (const re of [/<div[^>]+id="postViewArea"([\s\S]*)/i, /<div[^>]+class="[^"]*post_ct[^"]*"([\s\S]*)/i]) {
    const m = re.exec(html);
    if (m?.[1]) return toText(m[1].slice(0, 60_000));
  }
  return toText(html);
}

function pick(html: string, res: RegExp[]): string | undefined {
  for (const re of res) {
    const m = re.exec(html);
    if (m?.[1]) {
      const v = toText(m[1]).trim();
      if (v) return v;
    }
  }
  return undefined;
}

/**
 * 테마 알아내기 — 제목을 본문보다 무겁게 본다.
 * 제목에 테마 이름이 있으면 그 글은 거의 확실히 그 테마 후기다.
 * 본문에만 있으면 "다른 테마 얘기하다 스쳐 지나간" 경우가 섞인다.
 */
function detectTheme(title: string, body: string): { id: string; name: string; by: string } | null {
  const norm = (s: string) => s.replace(/[\s·・.,'"「」<>()]/g, "");
  const t = norm(title), b = norm(body);

  let best: { id: string; name: string; by: string; score: number } | null = null;
  for (const th of THEMES) {
    const key = norm(th.name);
    if (!key) continue;
    const inTitle = t.includes(key);
    // 본문 등장 횟수 — 많이 나올수록 그 테마 얘기다.
    const hits = b.split(key).length - 1;
    if (!inTitle && hits === 0) continue;
    const score = (inTitle ? 100 : 0) + hits;
    const by = inTitle ? "제목에서 찾음" : `본문에서 ${hits}번 나옴`;
    if (!best || score > best.score) best = { id: th.id, name: th.name, by, score };
  }
  return best ? { id: best.id, name: best.name, by: best.by } : null;
}

/**
 * 발췌 만들기 — 문단 단위로 담다가 상한에서 끊는다.
 *
 * 글자 수로 뚝 자르면 문장 중간에서 끊겨 읽다 만 느낌이 난다.
 * 그래서 **문단을 통째로** 담고, 다음 문단을 담으면 상한을 넘을 때 멈춘다.
 * 첫 문단이 이미 상한을 넘으면 그때만 문장(.!?) 경계에서 자른다.
 */
/* 후기다운 문장에 붙는 말들. 이게 많은 대목이 "테마 이야기"다.
   블로그 글 앞부분은 대개 인사말과 글쓴이 자기소개라서, 앞에서부터 400자를 자르면
   정작 우리 테마 얘기가 한 줄도 안 들어간다(실제로 첫 시도에서 그렇게 나왔다). */
const GOOD = /재밌|재미|즐겁|좋았|좋고|좋은|추천|만족|인상|퀄리|스케일|몰입|놀랍|놀랐|최고|감탄|완성도|디테일|연출|웅장|압도|긴장|여운|친절|성공|탈출|경험|분위기|무섭|소름|신선/g;
/* 결말·정답을 드러내는 대목은 피한다. 후기를 읽고 오는 손님의 재미를 우리가 깎으면 안 된다. */
const SPOIL = /스포|정답|답은|비밀번호|자물쇠는|힌트는|마지막 문제|엔딩은|범인/;

function makeExcerpt(body: string, title: string): string {
  const norm = (s: string) => s.replace(/\s/g, "");
  const t = norm(title);

  const paras = body.split(/\n{1,}/)
    // 보이지 않는 글자(zero-width space)만 있는 줄은 네이버 본문에 아주 많다. 먼저 지운다.
    .map((p) => p.replace(/[​﻿]/g, "").trim())
    .filter((p) =>
      p.length >= 20 &&
      !/^#/.test(p) &&
      !/^(사진|이미지|출처|▶|▲)/.test(p) &&
      !SPOIL.test(p) &&
      // 제목이 본문 첫 줄에 그대로 또 있는 경우가 흔하다. 카드에 제목을 두 번 보일 필요는 없다.
      !(t && norm(p) === t)
    );
  if (!paras.length) return "";

  /* 어디서부터 뽑을지 고른다.
     각 시작점마다 "400자 안에 담기는 문단들"을 모아 점수를 매기고, 제일 높은 곳을 쓴다.
     점수 = 후기다운 표현 수 (+ 글자 수는 아주 약하게만 반영해서, 길기만 한 대목이 이기지 않게 한다). */
  let best = { start: 0, score: -1 };
  for (let i = 0; i < paras.length; i++) {
    let len = 0, score = 0;
    for (let j = i; j < paras.length; j++) {
      if (j > i && len + paras[j].length > EXCERPT_MAX) break;
      score += (paras[j].match(GOOD) ?? []).length;
      len += paras[j].length + 1;
      if (len >= EXCERPT_MAX) break;
    }
    score += len / 4000; // 동점일 때만 갈리는 아주 작은 가중치
    if (score > best.score) best = { start: i, score };
  }

  const out: string[] = [];
  let len = 0;
  for (let j = best.start; j < paras.length; j++) {
    if (out.length && len + paras[j].length > EXCERPT_MAX) break;
    out.push(paras[j]);
    len += paras[j].length + 1;
    if (len >= EXCERPT_MAX) break;
  }
  let text = out.join("\n");

  if (text.length > EXCERPT_MAX) {
    const cut = text.slice(0, EXCERPT_MAX);
    const end = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"), cut.lastIndexOf("다"));
    text = (end > EXCERPT_MAX * 0.5 ? cut.slice(0, end + 1) : cut).trim() + " …";
  }
  // 글 중간에서 시작하면 앞이 잘린 티를 내준다 — 원문을 옮겨온 것이지 전부가 아님을 보이는 표시다.
  return (best.start > 0 ? "… " : "") + text;
}

/** 주소 하나로 후기 초안을 만든다. 저장은 하지 않는다(부르는 쪽이 결정). */
export async function fetchBlogReview(rawUrl: string): Promise<BlogDraft> {
  const id = parseNaverUrl(rawUrl);
  if (!id) {
    return { ok: false, error: "네이버 블로그 주소가 아닙니다. blog.naver.com/아이디/글번호 형태로 넣어주세요." };
  }

  // 모바일 주소에 본문이 그대로 들어 있다. 막히면 PostView 로 한 번 더.
  const tries = [
    `https://m.blog.naver.com/${id.blogId}/${id.logNo}`,
    `https://blog.naver.com/PostView.naver?blogId=${id.blogId}&logNo=${id.logNo}&redirect=Dlog&widgetTypeCall=true&directAccess=false`,
  ];

  let html = "";
  for (const url of tries) {
    try {
      const res = await fetch(url, {
        headers: {
          // 사람이 보는 것과 같은 화면을 받기 위해. 없으면 빈 껍데기를 주는 경우가 있다.
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
          "Accept-Language": "ko-KR,ko;q=0.9",
        },
      });
      if (!res.ok) continue;
      const t = await res.text();
      if (t.length > 1000) { html = t; break; }
    } catch { /* 다음 주소로 */ }
  }
  if (!html) return { ok: false, error: "블로그 글을 읽지 못했습니다. 글이 비공개이거나 삭제되었을 수 있습니다." };

  const title =
    pick(html, [/<meta property="og:title" content="([^"]+)"/i, /<title>([^<]+)<\/title>/i]) ?? "";
  const author =
    pick(html, [
      /<meta property="naverblog:nickname" content="([^"]+)"/i,
      /<span[^>]*class="[^"]*nick[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
      /<meta property="og:article:author" content="([^"]+)"/i,
    ]) ?? id.blogId;

  const bodyText = pickBodyText(html);
  if (bodyText.length < 40) {
    return { ok: false, error: "본문을 찾지 못했습니다. 글이 이미지로만 되어 있을 수 있습니다." };
  }

  // 작성일 — 화면에 "2026. 8. 5." 형태로 찍힌다.
  let postedAt: string | undefined;
  const d = /(20\d{2})\s*[.\-년]\s*(\d{1,2})\s*[.\-월]\s*(\d{1,2})/.exec(html);
  if (d) postedAt = `${d[1]}-${String(d[2]).padStart(2, "0")}-${String(d[3]).padStart(2, "0")}`;

  const theme = detectTheme(title, bodyText);

  return {
    ok: true,
    url: `https://blog.naver.com/${id.blogId}/${id.logNo}`,
    author: author.slice(0, 40),
    postedAt,
    title: title.slice(0, 120),
    themeId: theme?.id,
    themeName: theme?.name,
    matchedBy: theme?.by ?? "테마 이름을 못 찾음 — 직접 골라주세요",
    excerpt: makeExcerpt(bodyText, title),
    fullLength: bodyText.length,
  };
}
