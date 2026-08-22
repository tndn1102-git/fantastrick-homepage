import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RevealOnScroll from "@/components/RevealOnScroll";
import { WORLD_KEYS } from "@/lib/world";
import WorldVideo from "./WorldVideo";
import "./universe.css";

/* 세계관 페이지 — 〈사자의 서 / Book of Duat〉(2호점) · 아벨 연구소 내부망
   ─────────────────────────────────────────────────────────────
   컨셉(2026-08-22 전면 재설계): 판타스트릭 페이지가 아니라 **아벨 연구소 그 자체**.
   ① 위장 표면(멀쩡한 홍보 사이트) → ② 위험 테이프 → ③ 내부망(대외비 문서고).
   판타스트릭 헤더·푸터·챗봇·공지팝업은 /w/ 에서 렌더되지 않는다.

   출처: 인스타그램 세계관 계정 @abellaboratory (게시물 7건, 2022-02 ~ 2024) + 공개 영상 자막.
   ⚠️ 카피 규칙
     · 여기 적힌 **사실**은 전부 게시물·영상 원문에서 온 것이다. 없는 설정을 지어내지 않는다.
       (탐험가 5명·사망 1명·붉은 액체·토끼 실험·D급 연구원·2031년 이집트 — 전부 원문에 있다.)
     · 스탬프·열람등급·세션번호 같은 **표기 장식**은 UI 연출이다(사실 주장 아님).
     · '대조 결과' 절만 해석이다. 새 사실을 더하지 않고 이미 나온 문장끼리 부딪히게만 한다.
     · 스포일러 금지 — 테마 진행·장치·정답은 한 글자도 쓰지 않는다.
     · 가상 창작물 고지(.uv-fine)는 계정이 매 게시물에 붙이던 약속이다. 지우지 말 것. */

export const metadata: Metadata = {
  /* 제목·설명도 세계관 안에서 쓴다 — 카톡 공유 미리보기가 곧 첫인상이다.
     '판타스트릭'은 넣지 않는다(위장이 깨진다). 정체는 페이지 맨 아래 고지가 밝힌다. */
  title: "ABEL LABORATORY",
  description: "'질병 없는 세상을 만들어 갑니다.' 생명과학의 선두주자 아벨 연구소",
  robots: { index: false, follow: false, nocache: true,
    googleBot: { index: false, follow: false } },
  openGraph: {
    title: "ABEL LABORATORY",
    description: "'질병 없는 세상을 만들어 갑니다.'",
    images: ["/videos/redcrown-poster.webp"],
  },
};

// 성물의 세 가지 상태 — 출처: 「성물이란 무엇인가?」 (분류 코드는 UI 장식)
const RELIC_STATES = [
  { code: "상태 A", k: "규명되지 않음", d: "발견되지 않거나 규명되지 않아, 단지 신비한 현상으로만 치부되고 있는 것들." },
  { code: "상태 B", k: "시설 보관", d: "발견되어 형태를 띠고, 아담의 보호관리시설에 보관되는 것들." },
  { code: "상태 C", k: "개인 소지", d: "개인에 의해 보관 혹은 사용되고 있는 것들." },
];

/* DNA 이중나선 장식 — 위장 표면(파랑)과 성물 문서(금색)에서 재사용. 순수 장식이라 aria-hidden. */
function DnaSvg({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 600" aria-hidden="true" focusable="false">
      <path d="M60 0 C100 15 100 45 60 60 C20 75 20 105 60 120 C100 135 100 165 60 180 C20 195 20 225 60 240 C100 255 100 285 60 300 C20 315 20 345 60 360 C100 375 100 405 60 420 C20 435 20 465 60 480 C100 495 100 525 60 540 C20 555 20 585 60 600" />
      <path d="M60 0 C20 15 20 45 60 60 C100 75 100 105 60 120 C20 135 20 165 60 180 C100 195 100 225 60 240 C20 255 20 285 60 300 C100 315 100 345 60 360 C20 375 20 405 60 420 C100 435 100 465 60 480 C20 495 20 525 60 540 C100 555 100 585 60 600" />
      {[30, 90, 150, 210, 270, 330, 390, 450, 510, 570].map((y) => (
        <line key={y} x1={32} y1={y} x2={88} y2={y} />
      ))}
    </svg>
  );
}

/* 열쇠가 맞을 때만 페이지를 준다. 틀리면 그냥 '없는 주소'(404)로 보인다 —
   "비밀번호가 틀렸습니다" 같은 말을 하면 여기에 뭔가 있다는 걸 알려주는 셈이라 그러지 않는다. */
export function generateStaticParams() {
  return WORLD_KEYS.map((key) => ({ key }));
}
/* ⚠️ dynamicParams=false 를 쓰면 안 된다 (2026-08-22 배포에서 라이브 404 사고).
   Cloudflare(OpenNext)에선 미리 만든 페이지의 캐시 조회가 빗나갈 수 있는데,
   false 면 그때 즉석 렌더 대신 404 를 내버린다. 기본값(true)이면 즉석 렌더로 살아난다.
   틀린 열쇠의 404 는 위 컴포넌트의 notFound() 가 그대로 지킨다. */

export default async function UniversePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!(WORLD_KEYS as readonly string[]).includes(key)) notFound();

  return (
    <div className="uv">
      <RevealOnScroll />

      {/* ═══════════ ① 위장 표면 — 멀쩡한 홍보 사이트 ═══════════
          게시물의 밝은 얼굴(LET'S GET 파스텔·ADAM 일러스트)을 그대로 옮긴, 아무 문제 없어 보이는 껍데기.
          메뉴는 눌리지 않는다 — 위장 사이트니까. */}
      <section className="uv-cover">
        <DnaSvg className="uv-dna cover" />
        <div className="wrap">
          <nav className="uv-cover-nav" aria-hidden="true">
            <span className="cn-logo">ABEL <b>LAB</b></span>
            <span>연구분야</span>
            <span>사회공헌</span>
            <span>인재채용</span>
            <span>공지사항</span>
          </nav>

          {/* 슬로건 히어로 — 회사의 얼굴. 명조 세리프 + 그라디언트 하이라이트 + 형광펜 밑줄.
              등장 애니메이션은 CSS(uv-rise)로만 — 배지 → 슬로건 → 구분선 → 설명 순서로 떠오른다. */}
          <div className="uv-cover-hero">
            <span className="ch-badge"><i aria-hidden="true" />OUR MISSION</span>
            <h1 className="ch-slogan">
              <em>질병 없는 세상</em>을<br className="ch-br" />
              만들어 갑니다<span className="ch-dot">.</span>
            </h1>
            <div className="ch-rule" aria-hidden="true" />
            <p className="ch-sub">
              생명과학의 선두주자 〈아벨 연구소〉는 세균과 바이러스, <br className="pc-br" />그리고 유전적 질병에 대한
              치료제를 연구 개발하고 있습니다.
            </p>
            {/* 아래에 내용이 더 있다는 표시 — 마우스 모양 + 굴러 내려가는 점 + 화살표 */}
            <div className="ch-scroll" aria-hidden="true">
              <span className="mouse"><i /></span>
              <span className="chev" />
              <span className="txt">SCROLL</span>
            </div>
          </div>

          <div className="uv-cover-cards">
            <div className="uv-ccard">
              <span className="cc-k">Project</span>
              <b>레드크라운</b>
              <p>모든 질병과 유전질환의 치료라는 목표. 〈레드크라운〉 프로젝트를 통해 질병 없는 세상을 만들기 위해 노력하겠습니다.</p>
            </div>
            <div className="uv-ccard">
              <span className="cc-k">Campaign</span>
              <b>LET&rsquo;S GET 캠페인</b>
              <p>치료의 기회와 의료 혜택을 받기 어려웠던 분들을 위한 최고의 기회. 여러분의 많은 <br className="pc-br" />관심과 참여를 기다립니다.</p>
            </div>
            <div className="uv-ccard">
              <span className="cc-k">Partnership</span>
              <b>ADAM Inc. 자회사</b>
              <p>세계적 기업 아담의 자회사로서, 과학과 성물 에너지를 융합하는 기술을 연구하여 <br className="pc-br" />인류 발전에 기여하고 있습니다.</p>
            </div>
          </div>

          {/* 연구 현장 사진 — 연구소가 스스로 공개한 홍보 영상(첨부 3)에서 자른 스틸.
              밝은 표면에 '진짜 연구소 같은' 얼굴을 하나 더 얹는다. */}
          <div className="uv-cover-photos" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/videos/lab-blue.webp" alt="" width={720} height={330} loading="lazy" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/videos/lab-red.webp" alt="" width={720} height={330} loading="lazy" />
          </div>

          <div className="uv-cover-banner">
            <div>
              <div className="cb-t">BRING OUT THE HEALTH AND HAPPY</div>
              <div className="cb-m">LET&rsquo;S GET CAMPAIGN</div>
            </div>
            <div className="cb-s">캠페인에 참여하고 건강을 되찾으세요!</div>
          </div>

          <div className="uv-cover-foot">
            <span>© ABEL LABORATORY.</span>
            <span>본 기관은 국제 기구 ADAM Inc. 산하 연구기관입니다.</span>
          </div>
        </div>
      </section>

      {/* ═══════════ ② 경계 — 여기서부터 뒤집힌다 ═══════════ */}
      <div className="uv-gate">
        <div className="uv-tape" role="presentation"><span>RESTRICTED AREA · 관계자 외 접근 금지</span></div>
        <div className="wrap uv-gate-term">
          <p className="gt-line">&gt; 직원 인증 대기… <span className="gt-grant">ACCESS GRANTED :: CLEARANCE LEVEL D</span></p>
          <p className="gt-warn">※ 본 접속은 기록됩니다. 열람 내용의 외부 유출을 금합니다.</p>
        </div>
      </div>

      {/* ═══════════ ③ 내부망 — 대외비 문서고 ═══════════ */}
      <section className="uv-net">
        <div className="wrap">
          <div className="uv-sys">
            <div>
              <div className="sys-t">ABEL LABORATORY // INTERNAL ARCHIVE</div>
              <div className="sys-row">
                <span>열람등급 <b>LEVEL D</b></span>
                <span>문서 <b>4건</b> · 첨부 <b>2건</b></span>
                <span>사본 생성 <b>차단됨</b></span>
              </div>
            </div>
            <div className="sys-live" aria-hidden="true">
              <span className="rec"><i />REC</span>
              <span>LIVE</span>
              <div className="uv-radar" />
            </div>
          </div>

          <div className="uv-warn"><b>대외비</b> — 무단 열람·복제·유출 금지.</div>

          {/* ── 문서 01 · 모기업 ── */}
          <article className="uv-doc reveal">
            <div className="uv-doc-head">
              <span className="uv-doc-no">AL-DOC-01</span>
              <h2>모기업 — ADAM Inc.</h2>
              <span className="uv-stamp">대외비</span>
            </div>
            <div className="uv-doc-meta">
              <span>분류: 조직</span><span>작성: 보안과</span><span>배포: 내부 한정</span>
            </div>
            <p className="uv-doc-lead">
              아담은 중립적 입장에서 성물을 관리함으로써, <br className="pc-br" />어느 한 국가가 성물을 이용해
              국가 간 힘의 균형을 깨는 것을 방지하고 있다.
            </p>

            <div className="uv-org">
              <div className="uv-node">
                <span className="n-tag">Parent Company</span>
                <b className="n-name">ADAM Inc.</b>
                <span className="n-ko">아담 — 성물을 관리하는 세계적 보안 기업</span>
                <p>성물을 발견·회수하고, 각국에 비밀리에 <br className="pc-br" />설치된 보호관리시설에서 관리한다.</p>
              </div>
              <div className="uv-org-link" aria-hidden="true">자회사</div>
              <div className="uv-node danger">
                <span className="n-tag">Subsidiary</span>
                <b className="n-name">ABEL LAB</b>
                <span className="n-ko">아벨 연구소 — 생명과학 연구</span>
                <p>성물 중 생명과학에 적합한 것을 연구해, <br className="pc-br" />인류사회에 공헌할 신약과 기술을 개발한다.</p>
              </div>
            </div>

          </article>

          {/* ── 문서 02 · 성물 ── */}
          <article className="uv-doc gold reveal">
            <DnaSvg className="uv-dna doc" />
            <div className="uv-doc-head">
              <span className="uv-doc-no">AL-DOC-02</span>
              <h2>성물 — 정의와 상태 분류</h2>
              <span className="uv-stamp">대외비</span>
            </div>
            <div className="uv-doc-meta">
              <span>분류: 연구 기초</span><span>관리: ADAM 보호관리시설</span><span>보관 목록: 기밀</span>
            </div>
            <p className="uv-doc-lead">
              각국의 신화·설화, 여러 종교의 신성한 물건과 이적들을 통칭하는 개념.
              성물에는 각각의 고유한 능력이 깃들어 있다.
            </p>

            <dl className="uv-defs">
              {RELIC_STATES.map((s) => (
                <div className="uv-def" key={s.k}>
                  <dt>{s.k}<small>{s.code}</small></dt>
                  <dd>{s.d}</dd>
                </div>
              ))}
            </dl>
          </article>

          {/* ── 문서 03 · 사자의 서 회수 건 ── */}
          <article className="uv-doc gold reveal">
            <div className="uv-doc-head">
              <span className="uv-doc-no">AL-DOC-03</span>
              <h2>성물 〈사자의 서〉 — 회수 경위</h2>
              <span className="uv-stamp">대외비</span>
            </div>
            <div className="uv-doc-meta">
              <span>발견: 2031년 · 이집트</span><span>지정: 성물 · ADAM 관리</span><span>활용: 레드크라운 베이스</span>
            </div>
            <p className="uv-doc-lead">
              레드크라운의 베이스로 사용되는 성물. 2031년, 이집트의 버려진 사원 지하에서 발견되었다.
            </p>

            <p className="uv-attach"><b>첨부 1</b> — 대외 배포 기사 사본</p>
            {/* 기사 압축판(2026-08-22 사장님 지시 — 글 줄이기): 제목 + 현장 사진 + 핵심 증언만.
                원문 전문은 SNS-LOG 의 인스타 원본에서 볼 수 있다. */}
            <article className="uv-news">
              <div className="uv-news-top">
                <span>제20XX호 X판</span>
                <span className="masthead">성물공학 특별기획</span>
                <span>20XX년 0X월 0X일 X요일</span>
              </div>

              <h3>아벨연구소, 인류의 미래를 지키다</h3>
              <p className="sub">모든 질병을 치료할 수 있다는 만병통치제, 레드크라운 개발</p>

              <figure className="np-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/videos/duat-relic.webp" alt="사원 지하에서 발견된 사자의 서" width={720} height={330} loading="lazy" />
                <figcaption>▲ 사원 지하에서 발견된 성물 〈사자의 서〉</figcaption>
              </figure>

              <blockquote>
                &ldquo;추락한 동료들이 <mark>사자의 서</mark> 주변에 고여 있는 붉은 액체를 발견하고는 바로 마셨어요.
                그랬더니 갑자기 그 액체를 마신 동료들의 <mark>모든 상처가 치유</mark>됐습니다.&rdquo;
                <cite>— 실종됐다 구조된 탐험가 A씨(36)</cite>
              </blockquote>

              <p>
                인터뷰 이후 사자의 서는 성물로 지정되어 ADAM Inc.에서 관리하게 되었으며,
                ABEL LAB 이 이를 베이스로 레드크라운 치료제를 개발했다.
              </p>
              <p className="byline">XXX 기자(XXX@XXX.XX.XX)</p>
            </article>
          </article>

          {/* ── 문서 04 · 레드크라운 ── */}
          <article className="uv-doc reveal">
            <div className="uv-doc-head">
              <span className="uv-doc-no">AL-DOC-04</span>
              <h2>RC — 레드크라운</h2>
              <span className="uv-stamp">대외비</span>
            </div>
            <div className="uv-doc-meta">
              <span>기반: 성물 〈사자의 서〉</span><span>구분: 신약 · 임상 전</span><span>통칭: 만병통치약</span>
            </div>
            <p className="uv-doc-lead">
              어떤 상태에서도 약을 먹게 되면 건강해지는, 이른바 <b>&lsquo;만병통치약&rsquo;</b>.
            </p>

            {/* 생체 신호 곡선 — 아래 실험 기록(활성 → 정지)을 그림으로 옮긴 것. 뛰다가, 멎는다. */}
            <div className="uv-ecg" aria-hidden="true">
              <svg viewBox="0 0 600 80" preserveAspectRatio="none">
                <path pathLength={1000} d="M0 40 H55 L63 40 L70 16 L78 64 L85 40 H140 L148 40 L155 14 L163 66 L170 40 H225 L233 40 L240 18 L248 62 L255 40 H320 H600" />
              </svg>
              <span className="ecg-tag">실험체 생체 신호 — <b>신호 소실</b></span>
            </div>

            <div className="uv-lab-log">
              <div className="ll-head">실험 기록 — SNS 공개 영상 (실험체: 토끼)</div>
              <div className="ll-row">
                <span className="ll-t">투여 전</span>
                <span className="ll-d">죽은 듯 꼼짝않고 있던 상태.</span>
              </div>
              <div className="ll-row">
                <span className="ll-t">몇 초 뒤</span>
                <span className="ll-d">에너지가 넘치게, 너무도 건강한 모습으로 뛰어다니기 시작.</span>
              </div>
              <div className="ll-row dead">
                <span className="ll-t">몇 분 뒤</span>
                <span className="ll-d">다시 힘을 잃음. 결국 숨을 멎은 듯 움직이지 않게 됨.</span>
              </div>
            </div>

            {/* 공개 반응 — 원문 두 문단을 한 줄로 압축(글 줄이기) */}
            <p className="uv-note-line">
              공개 직후 윤리 논란이 일었으나 — 부정적인 시선은 현재 <b>완전히 사라진 상황</b>이다.
            </p>

            <p className="uv-attach"><b>첨부 2</b> — 대외 홍보 영상 (배포 승인본 · 59초)</p>
            <figure className="uv-video">
              {/* 큰 중앙 재생 버튼 포함 플레이어 — 영상 파일·포스터 경로는 WorldVideo.tsx 안에 */}
              <WorldVideo />
              <figcaption>
                <details>
                  <summary>&gt; 내레이션 전문 열람</summary>
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
          </article>

          {/* 문서 05(선발 기준)·대조 결과·대외 유포 기록은 2026-08-22 사장님 지시로 삭제.
              내용이 필요하면 git 역사 또는 인스타 @abellaboratory 원문 참조. */}

          {/* ── 가상 창작물 고지 — 계정의 약속. 지우지 말 것. ──
              (캠페인 참여 신청/예약 CTA 섹션은 2026-08-22 사장님 지시로 삭제 — 되살리지 말 것) */}
          <p className="uv-fine">
            본 페이지와 등장하는 기관·인물·사건은 모두 <b>가상의 창작물</b>로, 판타스트릭 방탈출의 두 번째 테마
            〈사자의 서 / Book of Duat〉를 위해 제작되었으며 실제와 아무 관련이 없습니다.
            원문은 세계관 계정{" "}
            <a href="https://www.instagram.com/abellaboratory/" target="_blank" rel="noopener noreferrer">
              @abellaboratory
            </a>
            에 2022년부터 게시된 창작물입니다. 테마의 진행·장치·정답은 담겨 있지 않습니다.
          </p>
        </div>
      </section>
    </div>
  );
}
