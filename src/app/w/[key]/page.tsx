import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RevealOnScroll from "@/components/RevealOnScroll";
import { WORLD_KEYS } from "@/lib/world";
import "./universe.css";

/* 세계관 아카이브 — 〈사자의 서 / Book of Duat〉(2호점)
   ─────────────────────────────────────────────────────────────
   출처: 인스타그램 세계관 계정 @abellaboratory (게시물 7건, 2022-02 ~ 2024).
   계정이 "아벨 연구소 공식 계정"인 척 쓴 홍보문을, 이 페이지도 같은 화법으로 옮긴다.
   ⚠️ 카피 규칙
     · 여기 적힌 사실은 **전부 게시물 원문에서 온 것**이다. 없는 설정을 지어내지 않는다.
       (탐험가 5명·사망 1명·붉은 액체·토끼 실험·D급 연구원 전부 게시물에 있는 문장이다.)
     · 마지막 '균열' 절만 해석이다. 그것도 새 사실을 더하지 않고 **이미 나온 문장끼리 부딪히게만** 한다.
     · 스포일러 금지 — 테마 안에서 무슨 일이 벌어지는지, 장치·정답은 한 글자도 쓰지 않는다.
       이 페이지는 "들어가기 전에 읽는 배경"까지만이다.
     · 가상 창작물 고지(.uv-disc)는 계정이 매 게시물에 붙이던 약속이다. 지우지 말 것. */

export const metadata: Metadata = {
  title: "아벨 연구소 자료실 — 사자의 서 세계관 | 판타스트릭",
  description:
    "ADAM Inc., 아벨 연구소, 성물, 그리고 만병통치약 〈레드크라운〉. 판타스트릭 2호점 방탈출 테마 〈사자의 서 / Book of Duat〉의 세계관 아카이브.",
  /* 🔒 숨은 페이지 — 검색·공유 미리보기 어디에도 실리지 않게 한다.
     이 페이지는 알림톡 링크로 들어온 손님만 보는 곳이다(sitemap 에도 없고, 사이트 안에 링크도 없다). */
  robots: { index: false, follow: false, nocache: true,
    googleBot: { index: false, follow: false } },
  openGraph: {
    title: "아벨 연구소 자료실 — 사자의 서 세계관",
    description: "'질병 없는 세상을 만들어 갑니다.' 생명과학의 선두주자 〈아벨 연구소〉 공식 자료실",
    images: ["/images/poster-duat.webp"],
  },
};

// ADAM 의 역할 3가지 — FILE 01 (출처: ADAM Inc.는 무슨 일을 하나요?)
const ROLES = [
  {
    t: "세계 기구적인 역할 수행",
    d: "강대국의 지원을 받아 운영되며, 어느 한 국가가 성물을 이용해 국가 간 힘의 균형을 깨는 것을 방지합니다.",
  },
  {
    t: "보호관리시설 설치",
    d: "성물은 아담이 직접 설계·관리하는 보호관리시설에서 관리됩니다. 각국의 이해관계를 고려해 시설은 비밀리에 설치되었으며, 어떤 성물을 보관 중인지는 기밀사항입니다.",
  },
  {
    t: "성물 연구",
    d: "보호·관리에 그치지 않고 성물의 특성과 힘을 연구해 인류 발전에 기여할 방안을 모색합니다. 이를 위해 자회사 ABEL LAB 을 설립했습니다.",
  },
];

// 성물의 세 가지 상태 — FILE 02 (출처: 성물이란 무엇인가?)
const RELIC_STATES = [
  { k: "규명되지 않음", d: "발견되지 않거나 규명되지 않아, 단지 신비한 현상으로만 치부되고 있는 것들." },
  { k: "시설 보관", d: "발견되어 형태를 띠고, 아담의 보호관리시설에 보관되는 것들." },
  { k: "개인 소지", d: "개인에 의해 보관 혹은 사용되고 있는 것들." },
];

// LET'S GET 6개 항목 — FILE 05. flag = 뒤의 '균열' 절에서 다시 지목하는 항목.
const LETS = [
  { k: "L", en: "LESS PEOPLE", d: "친인척이 없고 불우한 이웃을 대상으로 가산점 부여", flag: true },
  { k: "E", en: "ENROLL", d: "캠페인 신청 시 내부 심사 후 개별 연락" },
  { k: "T'S", en: "TARGET SICKER", d: "건강에 이상 있는 자 대상으로 진행", flag: true },
  { k: "G", en: "GENERAL PRACTITIONER", d: "아벨연구소 소속 의사 라이센스를 지닌 D급 연구원들을 담당의로 배치", flag: true },
  { k: "E", en: "EXPERIMENT", d: "임상실험 용도로 신약 '레드크라운' 투약" },
  { k: "T", en: "TURN", d: "성물을 기반으로 한 약물로, 부작용이 없어 투약 후 안전한 일상으로 복귀 보장" },
];

// 원본 게시물 7건 — 오래된 것부터. url 은 인스타그램 원문.
const POSTS = [
  { date: "2022. 02. 17.", t: "〈아벨 연구소〉", s: "계정 개설 — 연구소 소개", url: "https://www.instagram.com/p/CaEKdMavTP0/" },
  { date: "2022. 12. 30.", t: "나의 삶을 바꾸는 신약, 레드크라운", s: "6장 · 레드크라운이란 / 토끼 실험 영상 / LET'S GET", url: "https://www.instagram.com/p/CmyhpT1LL9D/" },
  { date: "2023. 01. 09.", t: "LET'S GET 캠페인", s: "3장 · 캠페인 안내 / 선발 기준 L·E·T·S·G·E·T", url: "https://www.instagram.com/p/CnMNQhHrOhW/" },
  { date: "2023. 02. 14.", t: "성물이란 무엇인가?", s: "3장 · 성물의 정의와 세 가지 상태", url: "https://www.instagram.com/p/CooeJcePyhM/" },
  { date: "2023. 02. 16.", t: "ADAM Inc.는 무슨 일을 하나요?", s: "4장 · 모기업 소개 / 보호관리시설 / 자회사 ABEL LAB", url: "https://www.instagram.com/p/CosDTWMvIt0/" },
  { date: "2023. 02. 16.", t: "아벨연구소, 인류의 미래를 지키다", s: "3장 · 성물공학 특별기획 지면 — 〈사자의 서〉 발견 경위", url: "https://www.instagram.com/p/CosDkd0PsVL/" },
  { date: "릴스", t: "인류의 희망, 레드크라운", s: "영상 · 프로젝트 발표", url: "https://www.instagram.com/reel/DBOPjLOs0lC/" },
];

/* 열쇠(key)가 맞을 때만 페이지를 준다. 틀리면 그냥 '없는 주소'(404)로 보인다 —
   "비밀번호가 틀렸습니다" 같은 말을 하면 여기에 뭔가 있다는 걸 알려주는 셈이라 그러지 않는다. */
export function generateStaticParams() {
  return WORLD_KEYS.map((key) => ({ key }));
}
// 목록에 없는 열쇠는 서버를 거치지도 않고 바로 404. (요청 낭비 0)
export const dynamicParams = false;

export default async function UniversePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!(WORLD_KEYS as readonly string[]).includes(key)) notFound();

  return (
    <div className="uv">
      <RevealOnScroll />

      {/* ─────────── 히어로: 자료실 입구 ─────────── */}
      <section className="uv-hero">
        <div className="wrap uv-hero-in">
          <div className="uv-eyebrow">Abel Laboratory · Public Archive</div>
          <h1>
            <span className="uv-quotemark">&lsquo;</span>질병 없는 세상을 만들어 갑니다.
            <span className="uv-quotemark">&rsquo;</span>
          </h1>
          <p className="uv-hero-sub">
            생명과학의 선두주자 〈아벨 연구소〉가 대외에 공개한 자료를 한자리에 모았습니다.
            성물의 정의부터 만병통치약 〈레드크라운〉, 그리고 지금 진행 중인 LET&rsquo;S GET 캠페인까지.
          </p>

          <div className="uv-meta">
            <span className="on">분류 · 대외 공개</span>
            <span>자료 7건</span>
            <span>모기업 ADAM Inc.</span>
            <span>기반 성물 · 사자의 서</span>
          </div>

          <div className="uv-hero-cta">
            <a href="#file-01" className="btn primary">자료 열람 →</a>
            <Link prefetch={false} href="/rooms/bookofduat" className="btn gold-ghost">
              테마 〈사자의 서〉 보기
            </Link>
          </div>

          <p className="uv-disc">
            이 자료실은 판타스트릭 2호점 방탈출 테마 <b>〈사자의 서 / Book of Duat〉</b>의 세계관 페이지입니다.
            등장하는 기관·인물·사건은 모두 가상의 창작물이며, 실제와 아무 관련이 없습니다.
            원문은 세계관 계정{" "}
            <a href="https://www.instagram.com/abellaboratory/" target="_blank" rel="noopener noreferrer" className="tlink">
              @abellaboratory
            </a>
            에 2022년부터 올라온 게시물입니다. 테마의 진행·장치·정답은 담지 않았습니다.
          </p>
        </div>
      </section>

      {/* ─────────── 공개 영상 (릴스 원본) ───────────
          ⚠️ 원본 파일이 9:16(720×1280)인데 **실제 화면은 가운데 16:9 띠(720×404, y=438)뿐**이고
             위아래는 검은 여백이다(전 구간 동일 — ffmpeg cropdetect 로 확인).
             그래서 다시 인코딩하지 않고 CSS 로만 잘라 쓴다:
             16:9 상자 + object-fit:cover 를 주면 브라우저가 정확히 그 띠만 남긴다
             (계산: 1600×900 상자에 720×1280 을 cover → 원본 y 437~842 가 보인다 = 딱 그 띠).
             재인코딩을 안 하니 화질 손실도 0 이다. */}
      <section className="uv-film">
        <div className="wrap">
          <div className="uv-file-head reveal rv-left">
            <span className="uv-no">FILM</span>
            <h2>인류의 희망, 레드크라운</h2>
          </div>
          <p className="uv-lead reveal">아벨 연구소가 공개한 프로젝트 발표 영상입니다. 1분.</p>

          <figure className="uv-video reveal">
            <video
              controls
              preload="none"
              playsInline
              poster="/videos/redcrown-poster.webp"
              width={720}
              height={404}
            >
              <source src="/videos/redcrown-reel.mp4" type="video/mp4" />
              이 브라우저는 영상을 재생하지 못합니다.
            </video>
            {/* 소리를 못 켜는 상황(사무실·지하철)이나 화면을 못 보는 손님을 위해 내레이션을 글로도 둔다.
                영상 자막을 그대로 옮긴 것이다. */}
            <figcaption>
              <details>
                <summary>내레이션 전문 보기</summary>
                <ol>
                  <li>인류의 역사는 항상 질병과의 전쟁으로 가득했습니다.</li>
                  <li>수많은 사람들이 병마로 쓰러져 갈 때, 우리는 아무것도 할 수 없었습니다.</li>
                  <li>하지만 이제는 다릅니다. 우리에겐 성물 &lsquo;사자의 서&rsquo;가 있기 때문이죠.</li>
                  <li>2031년 이집트에서 발견된 사자의 서. 이 발견은 새로운 희망이 됐습니다.</li>
                  <li>사자의 서는 모든 질병을 치료할 수 있는 만병통치약 [레드크라운]을 저희에게 안겨줬습니다.</li>
                  <li>수많은 시행착오를 거쳐 완성한 레드크라운, 드디어 곧 여러분들에게 공개될 예정입니다.</li>
                  <li>이 레드크라운만 있다면, 저희는 질병 없는 세상에서 살아가게 될 것입니다.</li>
                </ol>
              </details>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ─────────── FILE 01 · ADAM Inc. ─────────── */}
      <section className="uv-file" id="file-01">
        <div className="wrap">
          <div className="uv-file-head reveal rv-left">
            <span className="uv-no">FILE 01</span>
            <h2>성물을 관리하는 세계적 보안 기업</h2>
          </div>
          <p className="uv-lead reveal">
            아담(ADAM Inc.)은 중립적 입장에서 성물을 관리함으로써, 어느 한 국가가 성물을 이용해
            국가 간 힘의 균형을 깨는 것을 방지하고 있습니다.
          </p>

          <div className="uv-org reveal">
            <div className="uv-node parent">
              <span className="n-tag">Parent Company</span>
              <b className="n-name">ADAM Inc.</b>
              <span className="n-ko">아담 — 세계적 보안 기업</span>
              <p>성물을 발견·회수하고 각국에 설치된 보호관리시설에서 관리합니다.</p>
            </div>
            <div className="uv-link" aria-hidden="true">자회사</div>
            <div className="uv-node child">
              <span className="n-tag">Subsidiary</span>
              <b className="n-name">ABEL LAB</b>
              <span className="n-ko">아벨 연구소 — 생명과학 연구</span>
              <p>성물 중 생명과학에 적합한 것을 연구해, 인류사회에 공헌할 신약과 기술을 개발합니다.</p>
            </div>
          </div>

          <div className="uv-roles reveal">
            {ROLES.map((r) => (
              <div className="uv-role" key={r.t}>
                <b>{r.t}</b>
                <p>{r.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── FILE 02 · 성물 ─────────── */}
      <section className="uv-file relic">
        <div className="wrap">
          <div className="uv-file-head reveal rv-left">
            <span className="uv-no">FILE 02</span>
            <h2>성물이란 무엇인가?</h2>
          </div>
          <p className="uv-lead reveal">
            성물이라 불리는 물질 혹은 현상들은 각국의 신화·설화뿐 아니라, 여러 종교에서 말하는
            신성한 물건 및 이적들을 통칭하여 부르는 개념입니다. 성물은 각각의 고유한 능력이 깃들어 있으며,
            과거에 이 성물들이 보여준 능력이나 초자연적 현상들이 후대에 신화·설화 등으로 전해진 것들도 있습니다.
          </p>

          <dl className="uv-defs reveal">
            {RELIC_STATES.map((s) => (
              <div className="uv-def" key={s.k}>
                <dt>{s.k}</dt>
                <dd>{s.d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ─────────── FILE 03 · 사자의 서 (신문 지면) ─────────── */}
      <section className="uv-file relic">
        <div className="wrap">
          <div className="uv-file-head reveal rv-left">
            <span className="uv-no">FILE 03</span>
            <h2>버려진 사원에서 발견된 것</h2>
          </div>
          <p className="uv-lead reveal">
            레드크라운의 베이스로 사용되는 성물은 〈사자의 서〉입니다. <b>2031년 이집트</b>의 한 사원에서
            발견되어 주목을 받았습니다. 아래는 당시 지면 기사입니다.
            {/* 연도는 공개 영상 자막에서 온 것이다("2031년 이집트에서 발견된 사자의 서").
                신문 지면은 원본이 '20XX년'으로 가려 두었으므로 거기는 그대로 둔다. */}
          </p>

          <article className="uv-news reveal">
            <div className="uv-news-top">
              <span>제20XX호 X판</span>
              <span className="masthead">성물공학 특별기획</span>
              <span>20XX년 0X월 0X일 X요일</span>
            </div>

            <h3>아벨연구소, 인류의 미래를 지키다</h3>
            <p className="sub">모든 질병을 치료할 수 있다는 만병통치제, 레드크라운 개발</p>

            <div className="cols">
              <p>
                ABEL LAB 이 올해 연구를 거듭한 결과 치료제인 <mark>레드크라운을 개발</mark>해냈다고 발표했다.
                레드크라운의 베이스로 사용되는 성물은 <mark>사자의 서</mark>로, 이집트의 한 사원에서 발견되어 주목을 받았다.
              </p>
              <p>
                버려진 사원을 조사하던 탐험가 A씨(36) 등 5명이 실종되었다는 신고를 받고 출동한 ADAM Inc.의 직원이
                사원 내부를 조사하던 중, 사원 지하에서 실종자 전원과 사자의 서를 발견하였다고 밝혔다.
              </p>
              <p>
                당시 A씨는 &ldquo;사원을 살펴보던 중 바닥이 무너지면서 탐험가들이 지하로 추락하였는데,
                그 충격으로 한 명이 사망하고 여러 명이 부상을 당해 생존을 장담할 수 없는 상황&rdquo;이었다고 증언했다.
              </p>
              <p>A씨는 &ldquo;당시 주변에는 사자의 서가 있었다&rdquo;고 당시 상황 설명을 이어갔다.</p>
            </div>

            <blockquote>
              &ldquo;목이 너무 말랐던 탐험가 동료들이 주변을 살펴보던 중 사자의 서 주변에 고여 있는 붉은 액체를
              발견하고는 바로 마셨어요. 그랬더니 갑자기 그 액체를 마신 동료들의 모든 상처가 치유됐습니다.
              덕분에 구출될 때까지 버틸 수 있었어요.&rdquo;
              <cite>— 탐험가 A씨(36)</cite>
            </blockquote>

            <p>
              탐험가 A씨의 인터뷰 이후 사자의 서는 성물로 지정되어 ADAM Inc.에서 관리하게 되었으며,
              자회사인 ABEL LAB 에서 연구를 통해 레드크라운 치료제를 개발하는 큰 성과를 거두었다.
              ABEL LAB 에서는 &ldquo;〈레드크라운〉 프로젝트를 통해 질병 없는 세상을 만들기 위해 노력하겠다&rdquo;고 밝혔다.
            </p>
            <p className="byline">XXX 기자(XXX@XXX.XX.XX)</p>
          </article>
        </div>
      </section>

      {/* ─────────── FILE 04 · 레드크라운 ─────────── */}
      <section className="uv-file">
        <div className="wrap">
          <div className="uv-file-head reveal rv-left">
            <span className="uv-no">FILE 04</span>
            <h2>What is REDCROWN?</h2>
          </div>
          <p className="uv-lead reveal">
            레드크라운은 다른 약들처럼 특정 질병이나 증상에만 적용되는 것이 아닌, 어떤 상태에서도
            약을 먹게 되면 건강해지는 이른바 <b>&lsquo;만병통치약&rsquo;</b>이라고 알려져 있습니다.
          </p>

          <div className="uv-rc reveal">
            <div className="uv-panel">
              <h3>대중에게 친숙한 이름이 된 계기</h3>
              <p>
                아벨 연구소는 몇 년 전 SNS 에 레드크라운 실험에 관한 영상을 하나 게시하였습니다.
                죽은 듯 꼼짝않고 있던 토끼에게 레드 크라운을 주입한 결과—
              </p>
              <div className="uv-steps">
                <div className="uv-step">
                  <span className="t">투여 직후</span>
                  <span className="d">에너지가 넘치게, 너무도 건강한 모습으로 뛰어다니기 시작했다.</span>
                </div>
                <div className="uv-step end">
                  <span className="t">몇 분 뒤</span>
                  <span className="d">다시 힘을 잃은 토끼는 결국 숨을 멎은 듯 움직이지 않게 되었다.</span>
                </div>
              </div>
            </div>

            <div className="uv-panel">
              <h3>그리고 지금</h3>
              <p>
                해당 동영상은 순식간에 SNS 를 통해 퍼져나갔고, 실험에 대한 윤리문제를 제기하는 등
                부정적인 시선도 많았습니다.
              </p>
              <p>
                <span className="em">그러나</span> 해당 동영상을 통해 많은 사람들이 레드크라운에 대해 알게 되었고,
                레드크라운 프로젝트는 수많은 사람들의 응원과 지원 속에 지금의 결과를 가져올 수 있었습니다.
              </p>
              <p>부정적인 시선은 현재 완전히 사라진 상황입니다. 그 이유는 바로 다음 자료에 있습니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── FILE 05 · LET'S GET ─────────── */}
      <section className="uv-file">
        <div className="wrap">
          <div className="uv-file-head reveal rv-left">
            <span className="uv-no">FILE 05</span>
            <h2>LET&rsquo;S GET CAMPAIGN</h2>
          </div>
          <p className="uv-lead reveal">
            Bring out the health and happy. 렛츠겟 캠페인은 성물을 기반한 기술을 통해 개발한 아벨 연구소의 신약,
            레드크라운의 임상실험을 위한 참여형 캠페인입니다. 그동안 치료의 기회와 의료 혜택을 받기 어려웠던
            분들을 위한 최고의 기회이며, 의료서비스를 받기 힘든 사회적 약자들에게 레드크라운을 제공하여
            <b> 사회 공익을 실현하겠다는 취지</b>로 진행하고 있습니다.
          </p>

          <div className="uv-lets reveal">
            {LETS.map((l, i) => (
              <div className={"uv-let" + (l.flag ? " flag" : "")} key={i}>
                <span className="k" aria-hidden="true">{l.k}</span>
                <span className="txt">
                  <b>{l.en}</b>
                  <span className="d">{l.d}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="uv-panel reveal" style={{ marginTop: 22 }}>
            <p>
              해당 캠페인은 시판 전 임상실험으로써의 성격도 같이 하고 있기 때문에 절실한 사람들을
              실험 쥐로 이용하고 있다는 비판도 있으나, 전문가들은 이미 안정성 테스트는 완료되었다고 보고하며,
              이대로 공개해도 충분하지만 좀 더 완벽한 약품을 만들기 위한, 또 사회적 약자에게 조금 더
              봉사하기 위한 아벨연구소의 선행을 매도해선 안 된다고 평가하고 있습니다.
            </p>
            <p>
              <span className="em">
                아벨 연구소는 &ldquo;레드크라운의 정식 출시 후에도 LET&rsquo;S GET 캠페인은 계속 될 것&rdquo;이라고 발표했습니다.
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* ─────────── 균열: 자료끼리 부딪히는 지점 ─────────── */}
      <section className="uv-crack">
        <div className="wrap">
          <div className="uv-file-head reveal rv-left">
            <span className="uv-no">NOTE</span>
            <h2>자료가 말하지 않는 것</h2>
          </div>
          <p className="uv-lead reveal">
            여기까지가 연구소가 공개한 전부입니다. 새로 밝혀진 것은 없습니다.
            다만 위 자료들을 나란히 놓으면, 서로 맞지 않는 문장이 셋 보입니다.
          </p>

          <div className="uv-cracks">
            <div className="uv-crack-item reveal">
              <h3>1. 다섯 명이 내려갔고, 다섯 명이 발견되었다</h3>
              <p>
                기사는 &ldquo;그 충격으로 <span className="quote">한 명이 사망하고</span> 여러 명이 부상을 당해&rdquo;라고
                적은 뒤, 곧바로 &ldquo;사원 지하에서 <span className="quote">실종자 전원</span>과 사자의 서를 발견&rdquo;했다고 적습니다.
              </p>
              <p>
                붉은 액체는 마신 동료들의 <span className="quote">모든 상처</span>를 치유했습니다.
                사망한 한 명이 그 뒤 어떻게 되었는지는, 기사 어디에도 나오지 않습니다.
              </p>
            </div>

            <div className="uv-crack-item reveal">
              <h3>2. 홍보 영상의 결말은 죽음이다</h3>
              <p>
                레드크라운을 주입받은 토끼는 <span className="quote">몇 초 뒤 뛰어다녔고, 몇 분 뒤 움직이지 않게</span> 되었습니다.
                연구소는 이 영상을 실패 기록이 아니라 &lsquo;대중에게 친숙한 이름이 된 계기&rsquo;로 소개합니다.
              </p>
              <p>
                영상에서 달라진 것은 하나뿐입니다. 죽은 듯 꼼짝않던 토끼가, 잠깐 건강해 보였다는 것.
              </p>
            </div>

            <div className="uv-crack-item reveal">
              <h3>3. 찾을 사람이 없는 사람</h3>
              <p>
                캠페인의 선발 기준은 <span className="quote">건강에 이상 있는 자</span>를 대상으로,
                <span className="quote"> 친인척이 없고 불우한 이웃</span>에게 가산점을 주고,
                담당의로는 의사 라이센스를 지닌 <span className="quote">D급 연구원</span>을 배치합니다.
              </p>
              <p>
                &lsquo;사회 공익&rsquo;이라는 말로 설명되는 이 세 줄은, 뒤집으면 하나의 조건이 됩니다.
                아파서 절실하고, 사라져도 <span className="uv-redact">찾으러 올 사람이 없는</span> 사람.
              </p>
            </div>
          </div>

          <div className="uv-close reveal">
            <p>그리고 아벨 연구소는 지금도, 당신의 많은 관심과 참여를 기다리고 있습니다.</p>
            <div className="sig">Let&rsquo;s get — bring out the health and happy</div>
          </div>
        </div>
      </section>

      {/* ─────────── 원본 아카이브 ─────────── */}
      <section className="uv-arch">
        <div className="wrap">
          <div className="uv-file-head reveal rv-left">
            <span className="uv-no">ARCHIVE</span>
            <h2>원본 게시물</h2>
          </div>
          <p className="uv-lead reveal">
            위 자료의 출처입니다. 세계관 계정{" "}
            <a href="https://www.instagram.com/abellaboratory/" target="_blank" rel="noopener noreferrer" className="tlink">
              @abellaboratory
            </a>
            에서 2022년 2월부터 올라온 게시물 7건으로, 각 항목을 누르면 인스타그램 원문으로 이동합니다.
          </p>

          <div className="uv-list reveal">
            {POSTS.map((p) => (
              <a className="uv-item" key={p.url} href={p.url} target="_blank" rel="noopener noreferrer">
                <span className="date">{p.date}</span>
                <span className="ti">
                  {p.t}
                  <em>{p.s}</em>
                </span>
                <span className="go">원문 보기 ↗</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── 마무리 CTA ─────────── */}
      <section className="uv-cta">
        <div className="wrap">
          <h2>사자의 서 / Book of Duat</h2>
          <p>
            자료는 여기까지입니다. 나머지는 연구소 안에 있습니다.
            판타스트릭 2호점에서 직접 확인하세요.
          </p>
          <div className="row">
            <Link prefetch={false} href="/reserve?theme=bookofduat" className="btn primary">
              이 테마 예약하기 →
            </Link>
            <Link prefetch={false} href="/rooms/bookofduat" className="btn gold-ghost">
              테마 정보 보기
            </Link>
          </div>
          <div className="uv-spec">
            <span>2호점 · 사평대로 353, B1</span>
            <span>80분</span>
            <span>2~4인</span>
            <span>잠입 · SF 판타지</span>
          </div>
        </div>
      </section>
    </div>
  );
}
