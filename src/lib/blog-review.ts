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
 *   → 발췌(기본 400자 안쪽) + 원문 링크가 원칙이다. EXCERPT_MAX 가 그 상한이다.
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

const EXCERPT_MAX = 400;

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
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n").map((l) => l.trim()).join("\n")
    .trim();
}

/** 본문 영역만 잘라낸다. 못 찾으면 통째로 넘겨 뒤에서 걸러낸다. */
function pickBody(html: string): string {
  // 네이버 스마트에디터 본문 컨테이너들 — 버전마다 다르다.
  for (const re of [
    /<div[^>]+class="[^"]*se-main-container[^"]*"[\s\S]*?<\/div>\s*<\/div>/i,
    /<div[^>]+id="postViewArea"[\s\S]*?<\/div>/i,
    /<div[^>]+class="[^"]*post_ct[^"]*"[\s\S]*?<\/div>/i,
  ]) {
    const m = re.exec(html);
    if (m && m[0].length > 200) return m[0];
  }
  return html;
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
function makeExcerpt(body: string): string {
  const paras = body.split(/\n{1,}/).map((p) => p.trim())
    // 사진 설명·해시태그·군더더기 줄은 뺀다.
    .filter((p) => p.length >= 15 && !/^#/.test(p) && !/^(사진|이미지|출처|▶|▲)/.test(p));

  const out: string[] = [];
  let len = 0;
  for (const p of paras) {
    if (out.length && len + p.length > EXCERPT_MAX) break;
    out.push(p);
    len += p.length + 1;
    if (len >= EXCERPT_MAX) break;
  }
  let text = out.join("\n");

  if (text.length > EXCERPT_MAX) {
    const cut = text.slice(0, EXCERPT_MAX);
    const end = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"), cut.lastIndexOf("다"));
    text = (end > EXCERPT_MAX * 0.5 ? cut.slice(0, end + 1) : cut).trim() + " …";
  }
  return text;
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

  const bodyText = toText(pickBody(html));
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
    excerpt: makeExcerpt(bodyText),
    fullLength: bodyText.length,
  };
}
