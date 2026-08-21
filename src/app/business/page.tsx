"use client";
import Link from "next/link";
import Image from "next/image";
import { Fragment, useEffect, useRef, useState } from "react";
import { THEMES } from "@/lib/data";
import "./business.css";

/* 비즈니스(B2B) — 방탈출 매장 사장님·창업 준비자용.
   파는 것: ①통째로 만들기(턴키) ②제어기·장치(마스터·슬레이브) ③매장 운영 프로그램.
   브랜드·기관 협업은 보는 사람이 아예 다르므로 /business/collab 로 나눠 뒀다(2026-08-06).

   ⚠️ 카피 규칙 (에이전트 2종 조사 + 사장님 확인으로 굳힌 것 — 고칠 때 지킬 것)
     · 이모지 금지. 문장 속 대시(—) 금지. "A가 아니라 B입니다" 반복 금지.
     · 업계어: 장비(X) → 장치 / 블록(X) → 제어기·모듈 / 리셋(X) → 세팅.
     · 고장은 "장치 에러"로 쓴다(2026-08-21 통일. 죽었다·먹통 같은 은어 금지).
     · 타임은 "찬다". 방마다 장치 수가 다르므로 "보통 몇 개" 같은 기준선 문장은 쓰지 않는다.
     · 금액은 쓰지 않는다(사장님 지시 2026-08-06). 값은 보러 가서 말한다.
     · 근거 못 대는 우량 표시("많이 선택", "업계 1위") 금지. */


/* short = 화면 가장자리 길잡이에 쓰는 짧은 이름.
   본이름을 그대로 쓰면 길잡이가 168px 이 넘어 본문을 가린다(1440 화면에서 56px 겹침 실측). */
const SCOPES = [
  { id: "turnkey", label: "테마 통째로 만들기", short: "통째로", sub: "스토리부터 공사, 장치까지 전부 다" },
  { id: "device", label: "테마 안 장치와 기계", short: "장치", sub: "컴퓨터 라인, 장치, 센서 등등" },
  { id: "software", label: "매장 운영 프로그램", short: "프로그램", sub: "출퇴근, 대타 스케줄 관리, 쿠폰발행기, 홈페이지 등등" },
];

const KINDS = ["테마 전체 맡기기", "장치와 기계", "운영 프로그램", "그 밖에"];
// 보고 있는 화면에 맞춰 문의 유형을 미리 골라 둔다
const KIND_BY_SCOPE: Record<string, string> = {
  turnkey: "테마 전체 맡기기", device: "장치와 기계", software: "운영 프로그램",
};

/* 근무표 도해용 데이터.
   ⚠️ 실제 근무표가 아니다. 사람 이름·매장명·금액을 넣지 않는다 — 진짜 화면 캡처로 오인되면 안 된다. */
/* 실제 운영 화면 5장. 순서는 조사 결과를 그대로 따랐다 —
   근태·스케줄을 파는 6곳이 **전부 근무표를 1번**으로 내세웠다.
   캡션은 기능 나열이 아니라 사장님이 얻는 결과로 쓴다(조사 8곳 중 6곳이 이 방식).
   ⚠️ 이미지는 미리 줄여 넣는다 — scripts/prep-business-shots.mjs */
/** 실제 화면 캡처 한 칸. imgs 가 2장이면 나란히 놓는다(폰+PC 처럼 한 이야기일 때만). */
type ShotImg = { src: string; w: number; h: number; alt: string; label?: string; phone?: boolean };
type Shot = { title: string; cap: string; stamp: string; trio?: boolean; imgs: ShotImg[] };

/* 제품 묶음. id 는 CSS 의 색 이름표(--app)와 짝이다 — business.css 의 .app-* 참고 */
type AppGroup = { id: string; name: string; tag: string; shots: Shot[] };

const APPS: AppGroup[] = [
  { id: "att", name: "출퇴근 · 급여 프로그램", tag: "출퇴근 기록은 기본, 자동 급여 계산과 급여 명세서 일괄 발송까지 원버튼으로 뚝딱!",
    shots: [
      { title: "폰에서도 pc에서도 편하게 사용한다!",
        cap: "출근했다고 단톡에 올리는 것을 없앱니다. 폰에서도 PC에서도 동일하게 사용이 가능하고, 찍은 시간이 그대로 남아서 나중에 문제가 생기지 않습니다.",
        stamp: "판타스트릭 실제 운영중인 출퇴근 프로그램 화면입니다. (직원 이름은 가명)",
        imgs: [
          { src: "/images/business/shot-attendance-phone.webp", w: 780, h: 1600, phone: true, label: "직원 폰",
            alt: "직원이 자기 폰으로 출근과 퇴근을 찍는 화면." },
          { src: "/images/business/shot-attendance-pc.webp", w: 1440, h: 1000, label: "PC 화면",
            alt: "같은 출퇴근 기록을 PC 화면에서 달력으로 본다." },
        ] },
      { title: "근태가 급여로 넘어오고, 명세서는 메일로 한 번에",
        cap: "말일에 시급 계산기를 두드리지 않습니다. 찍힌 근태로 지급액과 공제가 계산되고, 확정한 명세서는 직원 메일로 일괄 발송됩니다. 전송이 제대로 되었는지까지도 기록에 남습니다.",
        stamp: "판타스트릭 관리자 실제 화면입니다. (이름과 메일은 가명)",
        imgs: [{ src: "/images/business/shot-payroll.webp", w: 1440, h: 1121,
          alt: "급여 관리자 화면. 직원별 지급 총계와 공제, 실 수령액이 계산돼 있고 확정과 발송 상태가 표시된다." }] },
    ] },

  { id: "sch", name: "근무 스케줄 앱", tag: "근무표와 대타를 직원들이 알아서, 사장님은 검토만 하시면 됩니다!",
    shots: [
      { title: "이번 달 근무표",
        cap: "일이 생겼을 때, 직원이 직접 신청하고 바꿔줄 사람이 승인하면 그걸로 끝납니다. 사장님이 단톡방에서 중재하실 일이 없어집니다.",
        stamp: "판타스트릭 3개 지점 실제 운영 화면",
        imgs: [{ src: "/images/business/shot-schedule.webp", w: 1440, h: 1080,
          alt: "근무 스케줄 프로그램의 월간 근무표. 날짜마다 근무자와 대타 신청이 표시된다." }] },
    ] },

  { id: "cpn", name: "쿠폰 발행기", tag: "발행부터 사용 통계까지",
    shots: [
      { title: "큐알 찍으면 그 자리에서 처리 끝",
        cap: "손님 폰의 쿠폰 QR코드를 직원이 찍으면 바로 사용 처리가 됩니다. 무슨 혜택인지도 그 자리에서 보여서 헷갈릴 일이 없습니다.",
        /* ⚠️ 실제 쿠폰을 쓰면 안 되므로(한 번 쓰면 되돌릴 수 없다) 시연용 쿠폰으로 찍었다.
           화면 자체는 직원이 매일 쓰는 실제 앱 그대로다. 캡션에도 시연임을 밝힌다. */
        stamp: "판타스트릭 직원용 실제 화면 · 시연용 쿠폰으로 촬영",
        imgs: [{ src: "/images/business/shot-coupon-scan.webp", w: 780, h: 1688, phone: true,
          alt: "직원이 카메라로 쿠폰 큐알을 찍어 사용 처리를 끝낸 화면. 처리 완료와 혜택 내용이 표시된다." }] },
      
      { title: "쿠폰 발행과 사용 처리",
        cap: "쿠폰을 직접 발행하고 QR코드로 찍어 처리합니다. 몇 장 나갔고 몇 장 쓰였는지가 한 화면에 있습니다.",
        stamp: "판타스트릭 실제 운영 화면",
        imgs: [{ src: "/images/business/shot-coupon.webp", w: 1440, h: 1080,
          alt: "쿠폰 관리자 화면. 총 발급과 사용 완료, 미사용 수와 호점별 사용 현황이 보인다." }] },
    ] },

  { id: "web", name: "예약 홈페이지", tag: "예약금 확인과 문자 발송이 자동으로 처리됩니다. 사장님이 전혀 신경쓸 것이 없습니다.",
    shots: [
      { title: "예약금 확인부터 문자 발송까지 사람 손을 안 탑니다",
        cap: "예약금이 들어오면 이름과 금액을 맞춰 예약이 알아서 확정으로 넘어갑니다. 확정 문자와 알림톡도 자동으로 나가고, 손님 카카오톡에 도착했는지까지 화면에 남습니다.",
        stamp: "fantastrick.co.kr 관리자 실제 화면 · 손님 이름과 연락처는 가명으로 바꿔 캡처",
        trio: true,
        imgs: [
          { src: "/images/business/shot-deposit.webp", w: 1100, h: 620, label: "① 입금 자동 확인",
            alt: "관리자 입금 화면. 입금 감시 상태와 처리 대기 없음이 표시된다." },
          { src: "/images/business/shot-message.webp", w: 1100, h: 504, label: "② 확정 문자 자동 발송",
            alt: "자동으로 나간 확정 안내 문자 내용. 예약자와 테마, 일시, 환불 규정이 들어 있다." },
          { src: "/images/business/shot-alimtalk.webp", w: 1100, h: 760, label: "③ 도착까지 확인",
            alt: "알림톡 발송 결과 화면. 총 건수와 도착 건수, 실패 건수가 보인다." },
        ] },
    ] },
];


const SW_DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const SW_BOARD = [
  { who: "직원 1", d: ["12-20", "12-20", "", "12-20", "12-20", "16-22", ""] },
  { who: "직원 2", d: ["", "16-22", "12-20", "16-22", "", "12-20", "12-20"] },
  { who: "직원 3", d: ["16-22", "", "16-22", "", "16-22", "대타", "16-22"] },
];

/* 지금 보는 범위 끝에서 나머지 둘로 넘어가는 줄.
   탭으로 나누면 "고른 것만 보고 나머지는 있는 줄도 모른다"가 늘 따라온다(NN/g).
   맨 아래에 다음 칸을 깔아두면 위로 되돌아가 탭을 누르지 않아도 이어서 보게 된다. */
/* 시안 08 — 후기가 씌어지는 순간. 문장이 뒷부분에 닿을 때 별이 하나씩 꺼진다.
 * ⚠️ 실제 후기가 아니다 — 카드에 "예시 후기" 표시를 박아 오인을 막는다.
 * 모션 줄임 설정이면 완성된 문장과 꺼진 별을 즉시 보여준다. 재생은 화면에 들어올 때 1회. */
function TypedReview() {
  const ref = useRef<HTMLDivElement>(null);
  const [txt, setTxt] = useState("");
  const [off, setOff] = useState(0);   // 꺼진 별 수
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const full = "테마는 정말 좋았는데, 장치가 멈춰서 흐름이 끊겼어요. 아쉬웠습니다.";
    const io = new IntersectionObserver((es) => {
      if (!es.some((x) => x.isIntersecting)) return;
      io.disconnect();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setTxt(full); setOff(3); return; }
      let i = 0;
      const t = window.setInterval(() => {
        i += 1; setTxt(full.slice(0, i));
        if (i === Math.floor(full.length * 0.45)) setOff(1);
        if (i === Math.floor(full.length * 0.7)) setOff(2);
        if (i >= full.length) { setOff(3); window.clearInterval(t); }
      }, 55);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <figure className="reveal typedrev">
      <p className="ftitle">그리고 그날 밤, 이런 후기가 올라옵니다</p>
      <div className="trv" ref={ref}>
        <span className="trv-ex">예시 후기</span>
        <div className="trv-st" aria-hidden="true">
          <span>{"★★★★★".slice(0, 5 - off)}</span><span className="o">{"★★★★★".slice(0, off)}</span>
        </div>
        <p className="trv-t">{txt}<span className="cur" aria-hidden="true">▋</span></p>
      </div>
      <figcaption>한번 남은 후기는 지울 수 없습니다. 그래서 고장은 손님보다 먼저 알아야 합니다.</figcaption>
    </figure>
  );
}


function NextUp({ here, pick }: { here: string; pick: (id: string) => void }) {
  const rest = SCOPES.filter((s) => s.id !== here);
  return (
    <div className="nextup reveal">
      <span className="nu-lab">이어서 보기</span>
      <div className="nu-btns">
        {rest.map((s) => (
          <button key={s.id} type="button" onClick={() => pick(s.id)}>
            <b>{s.label}</b><span>{s.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function BusinessPage() {
  // 손실 계산기 — 사장님이 자기 매장 숫자를 넣어보는 곳. 우리가 금액을 단정하지 않는다.
  // 확장 도해 — 모듈을 붙였다 뗐다 하며 "장치를 몇 개까지 물리나"를 손으로 확인하게 한다.
  const [mods, setMods] = useState(2);
  /* 지금 펼쳐 놓은 범위. 누르면 그 자리로 이동하는 게 아니라 **내용만 바뀐다**(사장님 지시 2026-08-06).
     한 페이지에 셋을 다 이어 붙였더니 12,000px 이 넘어서, 긴 것 자체가 문제였다.

     ⚠️ "안 고른 것은 영영 안 본다"는 탭의 고질병은 [이어서 보기] 줄로 막는다(각 화면 맨 아래).

     🔴 2026-08-07: 아래쪽 공통 블록을 없앴다.
        전에는 비교표·사후관리·경쟁사 우려·자주 묻는 것을 범위 밖에 두어 어느 탭에서도 보이게 했는데,
        사장님이 "탭을 바꿔도 아래는 똑같이 나온다"고 지적했다. 실제로 탭이 바뀐 느낌을 깎아먹었다.
        지금은 각 화면이 자기에게 맞는 것만 갖는다:
          ① 통째로 만들기 = 비교표 + 경쟁사 우려   ② 제어기 = 사후 관리 + 자주 묻는 것
          ③ 운영 프로그램 = 자기 내용만
        셋 다 [이어서 보기] + [문의]로 끝난다(문의는 한 번에 하나만 그려지므로 중복이 아니다). */
  const [here, setHere] = useState("turnkey");
  // 오른쪽 길잡이를 띄울지 (고르는 장이 화면 밖으로 나갔을 때만)
  const [showNav, setShowNav] = useState(false);
  // 문의
  const [form, setForm] = useState({ storeName: "", phone: "", rooms: "", area: "" });
  const [kind, setKind] = useState(KINDS[0]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formErr, setFormErr] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const switching = useRef(false);

  /* 스크롤 등장.
     ⚠️ here 를 의존성에 반드시 넣을 것 — 범위를 바꾸면 화면에 새 요소가 붙는데,
        처음 한 번만 관찰하면 그 요소들은 opacity:0 인 채로 영영 안 보인다. */
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { threshold: 0.14 }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [here]);

  // 주소에 #device·#software 가 붙어 오면 그 범위로 연다 (다른 곳에서 링크 걸 수 있게)
  useEffect(() => {
    const h = window.location.hash.replace("#", "");
    if (SCOPES.some((s) => s.id === h)) setHere(h);
  }, []);

  /* 고르는 장이 화면 밖으로 나가면 오른쪽 길잡이를 띄운다.
     고르는 자리가 보이는 동안에는 길잡이가 같은 말을 두 번 하는 셈이라 숨긴다. */
  useEffect(() => {
    const bar = document.getElementById("scopebar");
    if (!bar) return;
    /* ⚠️ "안 보이면 띄운다"로 하면 안 된다 — 페이지 맨 위에서는 고르는 장이 아직 **아래**에 있어서
          그것도 "안 보임"이라, 열자마자 길잡이가 뜬다. **지나간 뒤**(위로 사라진 뒤)만 띄운다. */
    const io = new IntersectionObserver(
      ([e]) => setShowNav(e.boundingClientRect.bottom < 0),
      { threshold: 0 }
    );
    io.observe(bar);
    return () => io.disconnect();
  }, []);

  const devices = 32 + mods * 32;

  /* 범위 바꾸기 — 내용을 갈아끼우고 **그 범위의 맨 처음으로 올려보낸다.**
     아래쪽 내용을 보다가 탭을 눌렀는데 그 자리에 그대로 있으면, 화면만 바뀌고
     지금 어디를 보는 건지 알 수 없다.

     ⚠️ 기준을 선택 줄(.scope)로 잡으면 안 된다 — sticky 라 스크롤을 내리면 화면 위에 붙어 있어서
        `rect.top + scrollY` 가 항상 "지금 스크롤 위치"로 나온다(= 이동이 0px). 실제로 그래서 안 움직였다.
        그래서 **바뀐 범위의 첫 섹션**을 기준으로 잡고, 고정 헤더(67) + 선택 줄 높이만큼 뺀다. */
  function pick(id: string) {
    /* 연타 잠금. 세 화면이 카본 검정 ↔ 크림 ↔ 흰색이라 빠르게 눌러대면 화면 전체 밝기가
       초당 몇 번씩 뒤집힌다. 빛에 예민한 분에게 위험한 깜빡임이라 잠깐 막는다. */
    if (id === here || switching.current) return;
    switching.current = true;
    window.setTimeout(() => { switching.current = false; }, 260);

    setHere(id);
    // 문의 유형도 지금 보는 것으로 맞춰 둔다. 손님이 칩을 다시 고르는 수고를 던다.
    setKind(KIND_BY_SCOPE[id] ?? KINDS[0]);
    history.replaceState(null, "", id === "turnkey" ? " " : `#${id}`);
    // 새 내용이 화면에 붙은 다음에 재야 위치가 맞는다
    requestAnimationFrame(() => {
      const sec = document.getElementById(id);
      if (!sec) return;
      /* 고르는 자리가 sticky 일 때만 그 높이를 뺀다. 지금은 sticky 가 아니라서
         빼면 그 장(章) 높이만큼 위로 튄다. 나중에 다시 sticky 로 바꿔도 알아서 맞는다. */
      const bar = document.getElementById("scopebar");
      const barH = bar && getComputedStyle(bar).position === "sticky" ? bar.getBoundingClientRect().height : 0;
      const y = sec.getBoundingClientRect().top + window.scrollY - 68 - barH;
      /* ⚠️ scrollTo 의 behavior:"smooth" 는 CSS 로 안 꺼진다(명시 옵션이 CSS 를 이긴다).
         모션을 줄이겠다고 설정한 손님에게는 여기서 직접 꺼야 한다. */
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: Math.max(0, y), behavior: reduce ? "auto" : "smooth" });
    });
  }

  async function sendInquiry(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setFormErr("");
    if (!form.storeName.trim()) { setFormErr("매장명 또는 성함을 입력해 주세요."); return; }
    if (form.phone.replace(/[^0-9]/g, "").length < 9) { setFormErr("연락처를 확인해 주세요."); return; }
    setSending(true);
    try {
      const res = await fetch("/api/business/inquiry", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, kind }),
      });
      if (res.ok) setSent(true);
      else {
        const j = await res.json().catch(() => ({}));
        setFormErr(j.error || "보내지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } catch {
      setFormErr("보내지 못했습니다. 인터넷 연결을 확인해 주세요.");
    }
    setSending(false);
  }

  return (
    /* has-bar — 좁은 화면에서 아래 길잡이가 떠 있는 동안 페이지 끝에 그만큼 자리를 비운다.
       안 그러면 마지막 줄(사업자 정보·문의 단추)이 길잡이에 가린다. */
    <div className={`bizsys${showNav ? " has-bar" : ""}`} ref={wrapRef}>
      {/* ══════════ 화면 오른쪽 길잡이 (넓은 화면) ══════════
          고르는 장은 한 번 지나가면 화면에서 사라진다. 다시 고르려고 8,000px 을 거슬러 올라가는 건
          너무 멀다. 그래서 지나간 뒤부터 오른쪽에 세로로 붙여둔다.
          ⚠️ 1200px 아래에서는 안 띄운다 — 본문 폭(1180)과 겹쳐 글자를 가린다. */}
      <nav className={`sidenav${showNav ? " on" : ""}`} aria-label="범위 바꾸기">
        {SCOPES.map((s, i) => (
          <button
            key={s.id} type="button" aria-current={here === s.id}
            className={`sn-${s.id}${here === s.id ? " on" : ""}`} onClick={() => pick(s.id)}
          >
            <i aria-hidden="true">{String(i + 1).padStart(2, "0")}</i>
            {/* 눈에는 짧은 이름, 화면낭독기에는 본이름 */}
            <b aria-hidden="true">{s.short}</b>
            <span className="sr">{s.label}</span>
          </button>
        ))}
      </nav>

      {/* 좁은 화면 — 아래쪽에 세 제목을 나란히. 세로 목록은 화면을 먹고 한 손 조작도 어렵다.
          ⚠️ 이 사이트는 폰에서 .float(예약)를 **오른쪽 위**로 옮겨 두었으므로 아래쪽은 비어 있다. */}
      <nav className={`botnav${showNav ? " on" : ""}`} aria-label="범위 바꾸기">
        {SCOPES.map((s, i) => (
          <button
            key={s.id} type="button" aria-current={here === s.id}
            className={`bn-${s.id}${here === s.id ? " on" : ""}`} onClick={() => pick(s.id)}
          >
            <i aria-hidden="true">{String(i + 1).padStart(2, "0")}</i>
            <b aria-hidden="true">{s.short}</b>
            <span className="sr">{s.label}</span>
          </button>
        ))}
      </nav>

      {/* HERO */}
      <section className="bz-hero">
        <div className="scan" />
        <div className="wrap">
          {/* 🔴 히어로는 중립이어야 한다.
              전에는 "방을 통째로 만듭니다"였는데, 그건 ①턴키만의 문장이라 페이지 전체가
              "턴키 시공사 소개"로 규정됐다. 그러면 아래 선택은 셋 중 고르는 자리가 아니라
              "턴키를 보는 방법 세 가지"로 읽힌다. 그 문장은 턴키 표제로 옮겼다. */}
          <div className="kicker">방탈출 인테리어 제작, 장치, 매장 운영 프로그램까지 모든 것</div>
          <h1>테마를 만드는 일부터<br />매장을 운영하는 일까지!</h1>
          <p className="sub">
            방탈출 테마를  통째로 만드는 일부터, 테마 내 장치를 움직이는 기계 
그리고 매장을 운영하는 프로그램까지. 
2012년부터 방탈출 매장을 운영해온 노하우로 전부 설계해드립니다.
          </p>
          <div className="bz-cta">
            <a className="btn primary" href="#cta">문의하기</a>
            <a className="btn ghost" href="#turnkey">제작 설계</a>
          </div>
          <div className="strip">
            <div><b>EST. 2012</b></div>
            <div><b>기획부터 장치 프로그램까지 모든 것</b></div>
          </div>
        </div>
      </section>

      {/* 고민 질문 — 범위와 상관없이 항상. 금액이나 스펙을 먼저 들이대면 방어가 걸린다 */}
      <div className="wrap">
        <section className="bz-sec">
                    <h2 className="reveal">사장님들이 한번 쯤 고민해본 것</h2>
          <div className="asks">
            <div className="ask reveal">매장을 새로 오픈하고 싶은데 어디서부터 문의를 해야할지 모르겠어요.</div>
            <div className="ask reveal">장치 에러가 났는데 어디로 문의해야 할지 모르겠어요.</div>
            <div className="ask reveal">테마를 하나 더 만들거나 인테리어를 어디에서 상담해야할까?</div>
            <div className="ask reveal">출퇴근 프로그램, 대타 스케줄 관리, 급여 계산,<br />홈페이지 등등 운영 프로그램을 도입하고 싶어요.</div>
          </div>
        </section>
      </div>

      {/* ══════════ 고르는 장(章) ══════════
          🔴 두 번 "강조가 안 된다"는 지적을 받은 자리다. 원인은 크기가 아니라 **격(格)** 이었다.
             얇은 sticky 띠는 화면 언어상 "도구 막대(필터·정렬)"라, 아무리 색을 칠해도
             상품을 고르는 자리로 안 읽힌다. 그래서 띠를 버리고 한 장을 통째로 줬다.
               · 물음을 15px 라벨에서 **h2(최대 46px)** 로 올렸다. 이 페이지에서 제일 중요한
                 갈림길이 소제목보다 작은 글자였던 게 진짜 문제였다.
               · 안 고른 카드도 보이게 했다. 전에는 테두리 알파 .16 이라 유령이었고,
                 대조군이 없으면 "고른 상태"도 안 읽힌다.
               · 폰에서 세로로 쌓는다. 가로로 두면 132px×3+간격 = 412px 이 필요한데
                 375px 폰의 가용 폭은 331px 이라 **03이 화면 밖으로 잘려 있었다.** */}
      <div className={`scopepick on-${here}`} id="scopebar">
        <div className="wrap">
          <div className="sp-head">
            <h2 id="scope-q">어떤 것이 궁금하신가요?</h2>
          </div>
          <div className="sp-cards" aria-labelledby="scope-q">
            {SCOPES.map((s, i) => (
              <button
                key={s.id} type="button" aria-pressed={here === s.id}
                className={`sp-${s.id}${here === s.id ? " on" : ""}`} onClick={() => pick(s.id)}
              >
                <i>{String(i + 1).padStart(2, "0")}</i>
                <b>{s.label}</b><span>{s.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════ ① 통째로 만들기 ══════════
          패널마다 배경·글씨체·색을 통째로 바꾼다(사장님 선택 2026-08-06: T2 종이 도면).
          ⚠️ 껍데기가 .wrap **바깥**에 있어야 배경이 화면 끝까지 칠해진다.
             안에 두면 밝은 배경이 가운데 카드처럼 떠 보인다. */}
      {here === "turnkey" && <div className="pn-turnkey">
        {/* 바뀌었다는 신호. key 를 주면 범위를 바꿀 때마다 새로 마운트되어 한 번만 지나간다 */}
        <span className="pn-sweep" key={here} aria-hidden="true" />
        <div className="wrap">
        {/* 범위 표제 — 여기서부터 이 화면이 시작한다는 선언. 히어로에 있던 문장을 이리로 옮겼다. */}
        <header className="pn-head">
          <i>01</i>
          <h2>테마 전체 설계</h2>
          <p>기획부터 시공까지</p>
        </header>
        <section className="bz-sec" id="turnkey">
          <h2 className="reveal">스토리부터 인테리어 문제까지<br />한 팀이 맡아서 전부 만들어드립니다.</h2>
          {/* 도면 모티프 — 장식이다. 읽을 정보가 아니라 "이 회사는 도면을 그린다"는 신호.
              스크린리더에서는 완전히 뺀다(정보가 아니라 신호라 읽으면 소음이 된다). */}
          <svg className="pn-plan" viewBox="0 0 320 240" aria-hidden="true" focusable="false">
            <g className="pl-thin">
              <path d="M24 22 H296" /><path d="M24 16 V28 M296 16 V28" />
              <path d="M24 28 V44 M296 28 V44" />
            </g>
            <g className="pl-wall">
              <path d="M24 44 H296 V214 H24 Z" />
              <path d="M172 44 V138 M172 176 V214" />
            </g>
            <g className="pl-thin">
              <path d="M172 138 V176" />
              <path className="pl-arc" d="M172 176 A38 38 0 0 0 210 138" />
              <path className="pl-wire" d="M56 190 H120 V96 H150" />
              <path className="pl-wire" d="M204 190 H262 V96 H236" />
            </g>
            <g className="pl-dev">
              <rect x="46" y="182" width="12" height="12" rx="2" />
              <rect x="144" y="90" width="12" height="12" rx="2" />
              <rect x="230" y="90" width="12" height="12" rx="2" />
              <rect x="256" y="182" width="12" height="12" rx="2" />
            </g>
          </svg>
          <p className="lead reveal">
            대부분은 스토리, 인테리어, 장치를 각각 다른 데 맡깁니다. 저희는 세 가지를 다 한팀에서 진행합니다. 
방탈출 제작을 2012년부터 쭉 한팀으로 
운영해온 노하우로 최고의 테마를 제작해드립니다.
          </p>

          <div className="trio">
            <div className="tri reveal">
              <div className="en">Contents</div>
              <h3>스토리와 문제</h3>
              <p>세계관을 구성하고 퀄리티 높은 문제 구성</p>
              <ul>
                <li>시나리오와 세계관</li>
                <li>문제와 장치 게임 설계</li>
                <li>연출과 사운드 디렉팅</li>
              </ul>
            </div>
            <div className="tri reveal">
              <div className="en">Space</div>
              <h3>공간과 인테리어</h3>
              <p>도면을 그리고 벽을 세우고 마감까지 합니다.</p>
              <ul>
                <li>평면과 동선 설계</li>
                <li>세트 제작과 인테리어 시공</li>
                <li>조명과 음향 설치</li>
                <li>전기 배선</li>
              </ul>
            </div>
            <div className="tri reveal">
              <div className="en">Device</div>
              <h3>장치와 제어</h3>
              <p>센서와 장치 기계까지 전부다 만듭니다.</p>
              <ul>
                <li>잠금 장치(전자석과 기계식)</li>
                <li>센서와 트리거</li>
                <li>연출 제어(조명, 음향, 영상)</li>
                <li>장치를 한꺼번에 움직이는 기계</li>
              </ul>
            </div>
          </div>

          {/* 전화할 곳이 몇 군데냐 — 비교표 한 줄로 묻기엔 아까운 차별점이라 도해로 올렸다 */}
          <div className="who2 reveal" style={{ marginTop: 22 }}>
            <div className="them">
              <h4>일반적으로</h4>
              <div className="cnt">여러 분야 전문가들에게 각각 문의 및 설계 진행 (높은 비용)</div>
              <ul>
                <li>시나리오 작가</li><li>인테리어</li><li>전기</li><li>장치 제작</li><li>시공</li>
              </ul>
            </div>
            <div className="us">
              <h4>저희는</h4>
              <div className="cnt">한 팀으로 모두 해결 , 저렴한 비용과 높은 퀄리티 보장.</div>
              <ul>
                <li>기획</li><li>인테리어</li><li>전기</li><li>장치</li><li>시공</li>
              </ul>
            </div>
          </div>

          {/* 공정 5단계 */}
          <h3 className="reveal pn-h3">진행 순서</h3>
          <div className="rail reveal" style={{ marginTop: 18 }}>
            <div><b>현장 방문</b><span>현장 보고 컨설팅 및 설계 진행</span><i>FANTASTRICK TEAM</i></div>
            <div><b>기획과 시나리오</b><span>스토리와 문제 설계</span><i>FANTASTRICK TEAM</i></div>
            <div><b>설계와 인테리어</b><span>도면, 세트, 마감</span><i>FANTASTRICK TEAM</i></div>
            <div><b>전기와 장치</b><span>배선, 장치 제작, 기계</span><i>FANTASTRICK TEAM</i></div>
            <div><b>공사와 오픈</b><span>현장 준비, 진행 담당 교육</span><i>FANTASTRICK TEAM</i></div>
          </div>

          {/* 우리가 만든 방들 */}
          <h3 className="reveal pn-h3">저희가 만들어 실제 운영중인 매장 및 테마들</h3>
          <p className="lead reveal" style={{ margin: "10px 0 18px" }}>
            FANTASTRICK TEAM이 만들고 현재 운영중인 매장들입니다.
          </p>
          <div className="works">
            {THEMES.map((t) => (
              <div className="work reveal" key={t.id}>
                {/* 대장 행이라 썸네일은 56px. 포스터는 증거일 뿐 주인공이 아니다 —
                    손님용 자산이라 B2B 화면에서 키우면 톤이 무너진다. */}
                <div className="th">
                  <Image src={t.poster} alt={t.name} width={56} height={75} sizes="56px" />
                </div>
                <div>
                  <h4>{t.name}</h4>
                  <div className="kv">{t.storeTag} · {t.genres.join(" · ")} · {t.minutes}분</div>
                  <div className="tags">
                    <span>기획</span><span>공간</span><span>배선</span><span>장치</span><span>제어</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        {/* 비교 */}
        <section className="bz-sec">
          <div className="kicker reveal">비교</div>
          <h2 className="reveal">FANTASTRICK TEAM은 다 가능합니다!</h2>
          <div className="cmp reveal">
            <div className="h">&nbsp;</div><div className="h">보통 방식</div><div className="h usc">판타스트릭</div>

            <div className="rowlab">기획부터 시공까지 어디까지 한 팀인가</div>
            <div><span className="mk n">&times;</span><span className="t mut">따로따로 맡김</span></div>
            <div className="usc"><span className="mk y">&#10003;</span><span className="t">한 팀이 끝까지</span></div>

            <div className="rowlab">방을 늘리고 싶을 때</div>
            <div><span className="mk n">&times;</span><span className="t mut">기계를 통째로 다시</span></div>
            <div className="usc"><span className="mk y">&#10003;</span><span className="t">판 하나만 더</span></div>

            <div className="rowlab">장치 에러를 어떻게 아는가</div>
            <div><span className="mk n">&times;</span><span className="t mut">사람이 발견</span></div>
            <div className="usc"><span className="mk y">&#10003;</span><span className="t">24시간 자동 알림</span></div>

            <div className="rowlab">작동을 안 할 때 전화할 곳</div>
            <div><span className="mk n">&times;</span><span className="t mut">시공사, 제작사, 부품사</span></div>
            <div className="usc"><span className="mk y">&#10003;</span><span className="t">FANTASTRICK  TEAM이 직접 받습니다.</span></div>

            <div className="rowlab">부품 단종되면</div>
            <div><span className="mk n">&times;</span><span className="t mut">그 업체만 만드는 기판</span></div>
            <div className="usc"><span className="mk y">&#10003;</span><span className="t">시중에서 구하기 용이한 부품들</span></div>

            <div className="rowlab">매장 운영 프로그램</div>
            <div><span className="mk n">&times;</span><span className="t mut">없음</span></div>
            <div className="usc"><span className="mk y">&#10003;</span><span className="t">출퇴근, 급여, 예약, 쿠폰</span></div>

            <div className="rowlab">만든 데가 방탈출을 하는가</div>
            <div><span className="mk n">&times;</span><span className="t mut">아니오</span></div>
            <div className="usc"><span className="mk y">&#10003;</span><span className="t">EST. 2012</span></div>
          </div>
        </section>

        {/* "경쟁사한테 사는 거 아니냐" 구역은 2026-08-13 사장님 지시로 통째로 삭제.
            (걱정을 먼저 꺼내는 게 오히려 걱정을 심는다는 판단) */}

        {/* 이 화면의 마무리 — 다음 범위로 넘기고, 문의로 받는다 */}
        <NextUp here={here} pick={pick} />

        {/* 문의 */}
        <section className="bz-sec" id="cta">
          <div className="ctabox reveal">
            <div className="kicker" style={{ justifyContent: "center" }}>CONTACT</div>
            <h2>컨설팅 문의하기</h2>
            <p className="lead center">새로운 테마도 좋고, 현재 운영중인 테마도 괜찮습니다. 
인테리어 리모델링, 장치, 문제. 설계, 운영 프로그램까지
 방탈출 매장에 필요한 모든 것을 편하게 문의해주세요 FANTASTRICK TEAM이 체계적으로 분석  및 검토 후에 
최적의 답변을 고객님께 전달드립니다!!</p>
            {sent ? (
              <div className="bzdone">
                <b>문의 잘 받았습니다.</b>
                <p>영업일 기준 하루 안에 전화 드립니다. 급하시면 <b>fantastrick@fantastrick.co.kr</b> 로도 연락 주세요.</p>
              </div>
            ) : (
              <>
                <div className="kinds" style={{ justifyContent: "center", margin: "22px 0 4px" }}>
                  {KINDS.map((k) => (
                    <button key={k} type="button" className={kind === k ? "on" : ""} onClick={() => setKind(k)}>{k}</button>
                  ))}
                </div>
                <form className="bzform" onSubmit={sendInquiry}>
                  <div>
                    <label htmlFor="bz-store">매장명 or 성명</label>
                    <input id="bz-store" maxLength={60} placeholder="○○이스케이프" autoComplete="organization"
                      value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="bz-tel">연락처</label>
                    <input id="bz-tel" inputMode="tel" maxLength={20} placeholder="010-0000-0000" autoComplete="tel"
                      value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="bz-rooms">규모</label>
                    <input id="bz-rooms" maxLength={40} placeholder="예: 방 3개"
                      value={form.rooms} onChange={(e) => setForm({ ...form, rooms: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="bz-area">지역</label>
                    <input id="bz-area" maxLength={40} placeholder="서울 강남"
                      value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
                  </div>
                  <div className="full">
                    <button type="submit" className="btn primary" style={{ width: "100%" }} disabled={sending}>
                      {sending ? "보내는 중…" : "문의하기"}
                    </button>
                  </div>
                </form>
                {formErr && <div className="bzerr">{formErr}</div>}
              </>
            )}
          </div>

          <div className="crossline reveal" style={{ marginTop: 22 }}>
            <p>브랜드 팝업이나 기업 교육처럼 방탈출 매장이 아닌 곳과의 협업도 가능합니다.</p>
            <Link prefetch={false} href="/business/collab">협업 이야기 보기 →</Link>
          </div>
        </section>
      </div></div>}

      {/* ══════════ ② 제어기 · 장치 ══════════ (D6 카본 · 시안) */}
      {here === "device" && <div className="pn-device">
        <span className="pn-sweep" key={here} aria-hidden="true" />
        <div className="wrap">
        <header className="pn-head">
          <i>02</i>
          <h2>테마 안 장치를 움직이는 기계</h2>
          <p>자물쇠와 센서, 조명을 한 대가 다 맡습니다</p>
        </header>
        <section className="bz-sec" id="device">
          <div className="kicker reveal">장치 고장의 영향</div>
          <h2 className="reveal">장치 하나에 에러가 나면<br /><strong>그  날 손님들의 만족도도 떨어집니다.</strong></h2>
          <p className="lead reveal">
            장치 하나가 고장난다고 해서 진행이 안되진 않겠죠.<br />대신 그 문제나 장치를 스킵한다거나,<br />진행이 매끄럽지 않고 몰입감도 깨질 겁니다.
          </p>

          {/* ⭐ 금액 계산기 → 만족도 곡선 + 타이핑 후기 (2026-08-21 사장님 선택: 시안 02+08 조합)
              [왜 바꿨나] 금액 계산은 이 화면의 메시지("몰입과 후기가 무너진다")와 결이 달랐다.
              돈 숫자 대신 ①만족도가 무너지는 순간의 곡선과 ②그 결과로 씌어지는 후기를 보여준다.
              근거: 피크엔드 법칙(손님은 가장 나빴던 순간과 마지막 순간으로 경험을 기억한다).
              시안 원본과 조사 출처: docs/시안-장치오류-만족도-10종.html (10안 중 02·08 채택) */}
          <figure className="reveal satcurve">
            <p className="ftitle">한 팀의 60분</p>
            <svg viewBox="0 0 640 200" role="img"
              aria-label="만족도 곡선. 오르다가 장치 정지 지점에서 급락한 뒤 끝까지 회복하지 못한다.">
              <line className="axl" x1="40" y1="170" x2="620" y2="170" />
              <line className="axl" x1="40" y1="20" x2="40" y2="170" />
              <text className="ax" x="44" y="30">만족도 높음</text>
              <text className="ax" x="44" y="164">낮음</text>
              <text className="ax" x="60" y="188">입장</text>
              <text className="ax" x="320" y="188">진행</text>
              <text className="ax" x="580" y="188">탈출</text>
              <polyline points="40,150 130,118 220,92 310,64 360,52 380,140 450,148 540,144 620,150" />
              <line className="xm" x1="372" y1="44" x2="388" y2="60" />
              <line className="xm" x1="388" y1="44" x2="372" y2="60" />
              <text className="drop" x="396" y="52">장치 정지</text>
              <circle className="dot" cx="380" cy="140" r="4" />
            </svg>
            <figcaption>손님은 가장 나빴던 순간과 마지막 순간으로 그날을 기억합니다.</figcaption>
          </figure>
          
          <TypedReview />
        </section>

        {/* 새 제어기 — 이 패널의 주인공. .pn-stage 는 여기 하나에만 붙인다(릴리즈 태그·조명) */}
        <section className="bz-sec pn-stage">
          <div className="kicker reveal">FANTASTRICK TEAM</div>
          <h2 className="reveal">저희가 만든 기계, <strong>[마스터와 슬레이브]</strong></h2>
          <p className="lead reveal">
            방 안에 설치되는 장치, 전자석, 센서, 연출 조명을<br />컴퓨터 한 대가  맡아서 움직이는 기계입니다.<br />본체(마스터) 한 대가 장치 32개를 맡고, 부족하면 옆에<br />판(슬레이브)을 하나 더 답니다. 또한, 테마의 모든 장치<br />(작동, 조명 켜고 끄기, 신호 주기 등)는 원격으로<br />pc와 모바일에서 제어가 가능합니다!
          </p>

          <div className="pcbstage reveal">
            <span className="newbadge">NEW</span>
            <svg className="pcb" viewBox="0 0 660 300" role="img"
              aria-label="본체 한 대에 늘림판이 이어진 구조 그림입니다. 본체가 장치 32개를 맡고, 판을 달 때마다 32개씩 늘어납니다.">
              <defs>
                <pattern id="pcbgrid" width="14" height="14" patternUnits="userSpaceOnUse">
                  <path d="M14 0H0V14" fill="none" stroke="#8fb6ff" strokeOpacity=".08" strokeWidth="1" />
                </pattern>
                <linearGradient id="busfade" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#6ea8ff" stopOpacity=".95" />
                  <stop offset="1" stopColor="#6ea8ff" stopOpacity=".25" />
                </linearGradient>
                {/* 치수선 화살촉 — auto-start-reverse 로 양끝에 같은 marker 를 쓴다 */}
                <marker id="pnArw" markerWidth="7" markerHeight="7" refX="6.5" refY="3.5"
                  orient="auto-start-reverse" markerUnits="userSpaceOnUse">
                  <path d="M0 0 L7 3.5 L0 7 Z" fill="#8fb6ff" fillOpacity=".72" />
                </marker>
              </defs>

              {/* 도면 눈금자 — 보드가 '측정된 물건'으로 읽히게 한다. 장식이 아니라 척도. */}
              <g className="pn-rule" aria-hidden="true">
                <line x1="16" y1="30" x2="266" y2="30" />
                {Array.from({ length: 19 }, (_, i) => (
                  <line key={`rt${i}`} x1={16 + i * 14} y1="30" x2={16 + i * 14} y2={i % 5 === 0 ? 21 : 25} />
                ))}
                <line x1="8" y1="40" x2="8" y2="240" />
                {Array.from({ length: 15 }, (_, i) => (
                  <line key={`rl${i}`} x1="8" y1={40 + i * 14} x2={i % 5 === 0 ? 0 : 4} y2={40 + i * 14} />
                ))}
              </g>

              {/* 마스터 */}
              <rect className="pn-master" x="16" y="40" width="250" height="200" rx="12"
                fill="url(#pcbgrid)" stroke="#6ea8ff" strokeOpacity=".72" strokeWidth="1.5" />
              {/* 마운팅 홀 — 클래스로 색을 잡아둔다(패널 스킨이 바뀌면 CSS 한 줄로 따라간다) */}
              <circle className="hole" cx="34" cy="58" r="4" fill="none" stroke="#8fb6ff" strokeOpacity=".5" />
              <circle className="hole" cx="248" cy="58" r="4" fill="none" stroke="#8fb6ff" strokeOpacity=".5" />
              <circle className="hole" cx="34" cy="222" r="4" fill="none" stroke="#8fb6ff" strokeOpacity=".5" />
              <circle className="hole" cx="248" cy="222" r="4" fill="none" stroke="#8fb6ff" strokeOpacity=".5" />
              <text className="silk-brand" x="52" y="78">FANTASTRICK</text>
              <text className="silk-model" x="52" y="103">마스터</text>
              <text className="silk-role" x="52" y="122">MASTER</text>
              <rect className="mcu" x="52" y="140" width="58" height="58" rx="4"
                fill="#8fb6ff" fillOpacity=".14" stroke="#8fb6ff" strokeOpacity=".7" />
              <text className="silk-tiny" x="81" y="173" textAnchor="middle">MCU</text>
              {/* 치수선 — 32칸의 폭을 실제로 잰다. 여기 쓰는 숫자는 사양표에 있는 32 뿐이다.
                  없는 치수(mm)를 지어내면 스펙 화면에서 그건 거짓말이 된다. */}
              <g className="pn-dim">
                <line x1="130" y1="140" x2="130" y2="123" />
                <line x1="252" y1="140" x2="252" y2="123" />
                <line x1="130" y1="128" x2="252" y2="128" markerStart="url(#pnArw)" markerEnd="url(#pnArw)" />
              </g>
              <text className="pn-dimtxt" x="191" y="118" textAnchor="middle">32</text>
              {/* 행 좌표 — 8열 × 4행 = 32. "32개"가 세어지는 숫자가 된다. */}
              <g className="pn-coord" aria-hidden="true">
                {["A", "B", "C", "D"].map((c, i) => (
                  <text key={c} x="124" y={151 + i * 16} textAnchor="end">{c}</text>
                ))}
              </g>
              {/* 출력 32칸 — 따로 묶어둔다. 마스터·슬레이브 판(fill=격자무늬)과 색 규칙이 달라서다. */}
              <g className="ports">
                {Array.from({ length: 32 }, (_, i) => (
                  <rect key={i} x={130 + (i % 8) * 16} y={142 + Math.floor(i / 8) * 16}
                    width="10" height="10" rx="2"
                    fill="#6ea8ff" fillOpacity=".22" stroke="#6ea8ff" strokeOpacity=".7" />
                ))}
              </g>
              <text className="silk-tiny" x="130" y="224">장치 32개</text>
              {/* 상태 표시 — 이 제품이 '스스로 보고 있다'는 유일한 시각 신호. 딱 하나만 둔다. */}
              <circle className="pn-led-ring" cx="232" cy="100" r="5" />
              <circle className="pn-led" cx="232" cy="100" r="5" />

              {/* 확장 버스 + 슬레이브 */}
              <path d="M266 140 H660" stroke="url(#busfade)" strokeWidth="2" fill="none" />
              <path className="pulse" d="M266 140 H660" strokeWidth="2.6" fill="none" />
              {[0, 1, 2].map((i) => (
                <g className="pn-slave" key={i} opacity={1 - i * 0.26}>
                  <rect x={300 + i * 118} y="96" width="98" height="88" rx="9"
                    fill="url(#pcbgrid)" stroke="#6ea8ff" strokeOpacity=".65" strokeWidth="1.2"
                    strokeDasharray={i === 2 ? "5 5" : "0"} />
                  <text className="silk-model sm" x={349 + i * 118} y="132" textAnchor="middle">슬레이브</text>
                  <text className="silk-tiny" x={349 + i * 118} y="152" textAnchor="middle">+32개</text>
                </g>
              ))}
            </svg>
          </div>

          <div className="spec reveal">
            <div><dt>본체 한 대가 맡는 장치</dt><span className="dots" /><dd>장치 32개</dd></div>
            <div><dt>판을 하나 달 때마다</dt><span className="dots" /><dd>32개씩</dd></div>
            <div><dt>한 대로 늘릴 수 있는 데까지</dt><span className="dots" /><dd>128개</dd></div>
            <div><dt>고장 감시</dt><span className="dots" /><dd>장치마다 자동으로 확인</dd></div>
            <div><dt>부품</dt><span className="dots" /><dd>시중에서 구할 수 있는 것</dd></div>
            <div><dt>보증</dt><span className="dots" /><dd>본체와 판 1년, 부품 6개월</dd></div>
          </div>

          <figure className="reveal" style={{ marginTop: 26 }}>
            <p className="ftitle">부족하면 판 단위로 추가가 가능합니다(판만 추가하면 되기 때문에 컴퓨터 단위로 늘리는 것 보다 훨씬 저렴합니다)</p>
            <div className="blocks">
              <div className="blk main"><b>본체</b><span>장치 32개</span></div>
              {Array.from({ length: mods }, (_, i) => (
                <span key={i} className="blkpair">
                  <span className="plus">+</span>
                  <span className="blk"><b>늘림판</b><span>+32개</span></span>
                </span>
              ))}
              <span className="blkpair">
                <span className="plus">+</span>
                <span className="blk ghost"><b>…</b><span>계속</span></span>
              </span>
            </div>
            <div className="steprow">
              <div className="stepper">
                <button type="button" onClick={() => setMods((m) => Math.max(0, m - 1))} aria-label="늘림판 빼기">&#8722;</button>
                <span className="v">늘림판 <b>{mods}</b>개</span>
                <button type="button" onClick={() => setMods((m) => Math.min(6, m + 1))} aria-label="늘림판 추가">+</button>
              </div>
              <div>
                <span className="bignum sm">{devices}</span>
                <span className="devsuf">개까지 물립니다</span>
              </div>
            </div>
            <figcaption>판 하나 달면 32개씩 늘어납니다. 본체는 처음 한 번만 사시면 되고요.</figcaption>
          </figure>

          {/* 방 늘릴 때 드는 돈 — 금액을 쓰지 않는다. 기울기 차이로만 읽게 한다. */}
          <figure className="reveal" style={{ marginTop: 14 }}>
            <p className="ftitle">장치를 늘려갈 때</p>
            <div className="step-chart">
              <svg viewBox="0 0 620 200" role="img"
                aria-label="방을 늘릴 때 드는 돈 비교. 기계를 통째로 다시 사는 방식은 늘릴 때마다 처음 금액이 또 들어 가파르게 올라가고, 판만 더하는 방식은 완만하게 올라갑니다.">
                <line className="gl" x1="46" y1="20" x2="600" y2="20" />
                <line className="gl" x1="46" y1="95" x2="600" y2="95" />
                <line className="gl" x1="46" y1="170" x2="600" y2="170" />
                <text className="axl" x="0" y="26">드는</text>
                <text className="axl" x="0" y="38">돈</text>
                <polyline fill="none" stroke="#8ea0c4" strokeWidth="2.5" strokeDasharray="7 5"
                  strokeLinejoin="round" strokeLinecap="round"
                  points="60,158 190,158 190,112 320,112 320,66 450,66 450,24 580,24" />
                <text className="dlab" x="516" y="17" textAnchor="middle" fill="#8ea0c4">기계를 다시</text>
                <polyline fill="none" stroke="#3585ea" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"
                  points="60,158 190,158 190,143 320,143 320,128 450,128 450,113 580,113" />
                <circle className="dot" cx="60" cy="158" r="5" />
                <circle className="dot" cx="190" cy="143" r="5" />
                <circle className="dot" cx="320" cy="128" r="5" />
                <circle className="dot" cx="450" cy="113" r="5" />
                <text className="dlab" x="516" y="106" textAnchor="middle">판만 하나 더</text>
                <text className="axl" x="60" y="190" textAnchor="middle">장치 32개</text>
                <text className="axl" x="190" y="190" textAnchor="middle">64개</text>
                <text className="axl" x="320" y="190" textAnchor="middle">96개</text>
                <text className="axl" x="450" y="190" textAnchor="middle">128개</text>
              </svg>
            </div>
            <figcaption>기계를 통째로 다시 사야 하는 방식이면, 장치를 늘릴 때마다 처음 냈던 돈이 또 나갑니다. 판만 더하면 되는 방식은 상대적으로 훨씬 저렴합니다.</figcaption>
          </figure>

          {/* 구성 — 금액 없음 */}
          <h3 className="reveal" style={{ margin: "44px 0 0", fontSize: 17, fontWeight: 800 }}>테마 규모와 장치 개수에 따라 맞춤형으로 진행됩니다.</h3>
          {/* ⚠️ gridTemplateColumns 를 인라인으로 두면 미디어쿼리를 이겨서 360px 폰에서도 2열로 남는다
                 (카드 폭 111px → "장치 23개까지"가 세 줄로 접힘). CSS 로 옮겼다. */}
          <div className="tiers" style={{ marginTop: 16 }}>
            <div className="tier reveal">
              <h3>베이직</h3>
              <div className="devbar"><i style={{ width: "18%" }} /></div>
              <div className="devn">장치 <b>23개</b>까지</div>
              <p>모노룸이나 1세대 방탈출 기준 적합한 모델입니다.</p>
            </div>
            <div className="tier hot reveal">
              <h3>프리미엄</h3>
              <div className="devbar"><i style={{ width: "25%" }} /></div>
              <div className="devn">장치 <b>32개</b>부터</div>
              <p>방 2개 이상에 들어가는 모델입니다.</p>
            </div>
          </div>
          <p className="note reveal">방 규모와 장치 개수에 따라 달라질 수 있습니다. FANTASTRICK TEAM이 체계적으로 현장 분석 후 맞춤 설계해 드립니다.</p>
        </section>

        {/* 누가 먼저 아느냐 */}
        <section className="bz-sec">
          <div className="kicker reveal">누가 먼저 아느냐</div>
          <h2 className="reveal">손님이 무전기누르기 전에<br /><strong>아셔야 합니다!</strong></h2>

          <figure className="reveal">
            <p className="ftitle">누가 먼저 아느냐에 따라 손해도 손해지만 만족도와 몰입감 차이가 극명하게 갈립니다.</p>
            <div className="bars">
              <div className="bar">
                <div className="lab">손님이 먼저</div>
                <div className="track">
                  <div className="fill bad">몰입감과 의욕이 떨어지는건 기본이고, 상황에따라 금액 환불이나 테마 후기가 매우 안좋아질 수 있다.</div>
                </div>
              </div>
              <div className="bar">
                <div className="lab">직원이 먼저</div>
                <div className="track">
                  <div className="fill warn">그나마 다행이지만 몰입감이 깨지고 테마에 대한 만족도가 높지 않다.</div>
                </div>
              </div>
              <div className="bar">
                <div className="lab">우리가 먼저</div>
                <div className="track"><div className="fill z">최상의 테마 컨디션으로 최고의 몰입감을 이끌어 내 고객의 테마 만족도가 최상에 도달한다.</div></div>
              </div>
            </div>
            <figcaption>
              <p>기계가 장치 상태를 스스로 살핍니다. 문제가 발생하면 바로 FANTASTRICK TEAM에게 보고가 들어오고 원격으로 바로 처리합니다!</p>
              <p></p>
            </figcaption>
          </figure>
        </section>
        {/* 사후 관리 — 상품과 상관없이 궁금한 것이라 범위 밖에 둔다 */}
        <section className="bz-sec">
          <div className="kicker reveal">사후 관리</div>
          <h2 className="reveal">전화 한 통이면 <strong>끝납니다.</strong></h2>
          <p className="lead reveal">어디에 전화해야 하는지 고민하실 일이 없습니다.<br />저희 FANTASTRICK TEAM이 관리해드립니다.</p>
          <div className="trust">
            <div className="reveal"><b>24시간 고장 감시</b><span>장치가 응답을 안 하면 저희가 먼저 알고 연락드립니다.</span></div>
            <div className="reveal"><b>원격으로 가능한건  원격으로 바로 처리</b><span>방문 없이 처리되는 건 그 자리에서 끝냅니다.</span></div>
            <div className="reveal"><b>장치 AS 도 직접</b><span>저희가 만든 장치, 저희가 책임집니다.</span></div>
            <div className="reveal"><b>프로그램 유지 보수 기능 추가도 가능</b><span>원하시는 부분만 말씀해주세요!  맞춰서 제공해드립니다.</span></div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bz-sec">
          <div className="kicker reveal">자주 묻는 것</div>
          <h2 className="reveal">어떤게 궁금하신가요?</h2>
          <div className="reveal">
            <details>
              <summary>지금 매장에 있는 장치, 안 뜯고 그대로 쓸 수 있나요?</summary>
              <div className="b">대부분 사용 가능합니다. 정확한건 구조를 보고 현장 미팅 후 말씀드릴 수 있습니다.</div>
            </details>
            <details>
              <summary>공사하는 동안 매장 닫아야 하나요?</summary>
              <div className="b">왠만하면 닫지 않고 진행하겠지만 구조나 규모에 따라 잠시 닫고 진행해야할 수도 있습니다. 최소화하겠습니다.</div>
            </details>
            <details>
              <summary>장치 에러가 나면 얼마나 빨리 오시나요?</summary>
              <div className="b">장치가 응답을 안 하면 저희가 먼저 알고 연락드립니다. 원격으로 가능한 건 바로 처리도와드리고, 출장이 필요한 경우 일정예약 후 최대한 빠르게 방문드리고 있습니다.</div>
            </details>
            <details>
              <summary>방 하나만 새로 만들 수도 있나요?</summary>
              <div className="b">가능합니다. 장치 하나, 방 하나 또는 방 전체 원하시는대로 맞춰서 진행해드립니다.</div>
            </details>
            <details>
              <summary>기계만 사고 나머지는 저희가 해도 되나요?</summary>
              <div className="b">가능합니다.. 기계만 가져가셔도 되고, 운영 프로그램만 쓰셔도 됩니다. 원하시는 부분을 말씀해주시면 맞춰서 진행해드립니다.</div>
            </details>
          </div>
        </section>

        {/* 이 화면의 마무리 — 다음 범위로 넘기고, 문의로 받는다 */}
        <NextUp here={here} pick={pick} />

        {/* 문의 */}
        <section className="bz-sec" id="cta">
          <div className="ctabox reveal">
            <div className="kicker" style={{ justifyContent: "center" }}>CONTACT</div>
            <h2>컨설팅 문의하기</h2>
            <p className="lead center">새로운 테마도 좋고, 현재 운영중인 테마도 괜찮습니다. 
인테리어 리모델링, 장치, 문제. 설계, 운영 프로그램까지
 방탈출 매장에 필요한 모든 것을 편하게 문의해주세요 FANTASTRICK TEAM이 체계적으로 분석  및 검토 후에 
최적의 답변을 고객님께 전달드립니다!!</p>
            {sent ? (
              <div className="bzdone">
                <b>문의 잘 받았습니다.</b>
                <p>영업일 기준 하루 안에 전화 드립니다. 급하시면 <b>fantastrick@fantastrick.co.kr</b> 로도 연락 주세요.</p>
              </div>
            ) : (
              <>
                <div className="kinds" style={{ justifyContent: "center", margin: "22px 0 4px" }}>
                  {KINDS.map((k) => (
                    <button key={k} type="button" className={kind === k ? "on" : ""} onClick={() => setKind(k)}>{k}</button>
                  ))}
                </div>
                <form className="bzform" onSubmit={sendInquiry}>
                  <div>
                    <label htmlFor="bz-store">매장명 or 성명</label>
                    <input id="bz-store" maxLength={60} placeholder="○○이스케이프" autoComplete="organization"
                      value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="bz-tel">연락처</label>
                    <input id="bz-tel" inputMode="tel" maxLength={20} placeholder="010-0000-0000" autoComplete="tel"
                      value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="bz-rooms">규모</label>
                    <input id="bz-rooms" maxLength={40} placeholder="예: 방 3개"
                      value={form.rooms} onChange={(e) => setForm({ ...form, rooms: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="bz-area">지역</label>
                    <input id="bz-area" maxLength={40} placeholder="서울 강남"
                      value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
                  </div>
                  <div className="full">
                    <button type="submit" className="btn primary" style={{ width: "100%" }} disabled={sending}>
                      {sending ? "보내는 중…" : "문의하기"}
                    </button>
                  </div>
                </form>
                {formErr && <div className="bzerr">{formErr}</div>}
              </>
            )}
          </div>

          <div className="crossline reveal" style={{ marginTop: 22 }}>
            <p>브랜드 팝업이나 기업 교육처럼 방탈출 매장이 아닌 곳과의 협업도 가능합니다.</p>
            <Link prefetch={false} href="/business/collab">협업 이야기 보기 →</Link>
          </div>
        </section>
      </div></div>}

      {/* ══════════ ③ 매장 운영 프로그램 ══════════ (S1 밝은 SaaS) */}
      {here === "software" && <div className="pn-software">
        <span className="pn-sweep" key={here} aria-hidden="true" />
        <div className="wrap">
        <header className="pn-head">
          <i>03</i>
          <h2>매장 운영 프로그램</h2>
          <p>방탈출 매장을 더욱 편리하게 운영하게 도와주는 프로그램들</p>
        </header>
        <section className="bz-sec" id="software">
          <h2 className="reveal">사장님이 <em>엑셀로</em><br />하고 계신 것들</h2>
          <p className="lead reveal">직원 출퇴근 관리, 급여관리, 대타 스케줄 관리,<br />쿠폰 발행 및 통계 시스템, 홈페이지까지도<br />방탈출 운영의 모든 것!</p>

          <div className="swtable reveal">
            <div className="h">&nbsp;</div><div className="h">지금 하고 있는 방식</div><div className="h usc">바뀌는 것</div>

            <div className="rowlab">출퇴근과 근무표</div>
            <div className="t mut">출퇴근은 단톡에 카톡으로, 근무표는 엑셀 짜서 사진으로 올림</div>
            <div className="usc t">각자의 폰으로 찍습니다. 대타도 서로 신청하고 본인들이 알아서 승인합니다.</div>

            <div className="rowlab">급여와 매출 장부</div>
            <div className="t mut">말일에 시급 계산기 두드림</div>
            <div className="usc t">찍힌 근태가 그대로 급여로 넘어갑니다. 매출까지 한 화면에서.</div>

            <div className="rowlab">예약과 홈페이지</div>
            <div className="t mut">외부 플랫폼 수수료, 손 안 대는 홈페이지</div>
            <div className="usc t">자체 예약, 취소, 환불 규정까지. 홈페이지에서 모든게 자동화로 이루어집니다.</div>

            <div className="rowlab">쿠폰</div>
            <div className="t mut">종이 쿠폰, 누가 썼는지 모름, 인쇄비용 많이 발생</div>
            <div className="usc t">발행하고 큐알코드로 사용처리만 뚝딱! 사용량은 통계페이지에서 한번에 관리.</div>
          </div>

          {/* ⭐ 실제 운영 화면 — 2026-08-20 사장님 지시로 도해를 전부 캡처로 교체했다.
              [왜] 국내외 22개사 제품 페이지를 전수 조사한 결과:
                · 기능 설명부에 **실제 캡처**를 쓰는 곳 9/11. 도해로 대체하는 곳 0곳.
                · 도해가 사는 자리는 "구조·왜 우리인가·업종 목록" 뿐이다(11/11).
                · 소상공인 대상은 5~8장. 10장 넘는 곳 없음.
                · 개인정보는 **더미 데이터가 프리미엄. 블러 쓴 곳 0곳**(블러는 숨길 게 있다는 신호).
              전에 있던 "그림으로 옮긴 화면" 태그는 캡처 오인을 막으려던 장치였는데,
              B2B 페이지에서는 그대로 "아직 없는 물건" 신호로 읽혀서 걷어냈다.

              [개인정보] 캡처에 뜬 직원 이름 12명·로그인 아이디 20개는 **가명으로 바꿔서 찍었다.**
              DB 는 건드리지 않았다(브라우저에 그려진 글자만 교체). 전화번호는 전부 0.

              [우리 매장 이름은 일부러 남긴다] 조사 22곳 중 "직접 운영하며 만들었다"고 말하는 곳이
              0곳이었다. 규모도 대기업 로고도 없는 우리가 이길 수 있는 유일한 자리라,
              화면에 박힌 우리 매장 이름이 곧 증거다(2026-08-20 사장님 확인). */}
          <div className="apps">
            {APPS.map((a, ai) => (
              <section className={"appgrp reveal app-" + a.id} key={a.id}>
                {/* 제품 이름표 — 색·번호·이름으로 "여기부터 다른 프로그램"임을 알린다 */}
                <div className="app-head">
                  <span className="app-chip">{String(ai + 1).padStart(2, "0")} {a.name}</span>
                  <span className="app-tag">{a.tag}</span>
                </div>
                <div className="shots">
                  {a.shots.map((s) => (
                    <figure className={"shot" + (s.imgs.length > 1 ? " pair" : "") + (s.trio ? " trio" : "") + (s.imgs[0].phone ? " phone" : "")} key={s.title}>
                      <p className="s-title">{s.title}</p>
                      <div className="s-imgs">
                        {s.imgs.map((im) => (
                          <div className={"s-frame" + (im.phone ? " ph" : "")} key={im.src}>
                            <Image src={im.src} alt={im.alt} width={im.w} height={im.h} sizes="(max-width: 900px) 92vw, 620px" />
                            {im.label && <span className="s-lab">{im.label}</span>}
                          </div>
                        ))}
                      </div>
                      <figcaption>
                        {s.cap}
                        <span className="s-stamp">{s.stamp}</span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            ))}
          </div>


          <p className="lead reveal" style={{ margin: "22px 0 0" }}>
            모든 프로그램은 매장에 맞게 설계해드립니다.
          </p>

          <h3 className="reveal" style={{ margin: "44px 0 0", fontSize: 17, fontWeight: 800 }}>예약금 들어오는걸 계속 기다렸다가 확정처리 하실 필요가 없습니다!</h3>
          <p className="lead reveal" style={{ margin: "10px 0 18px" }}>
            예약금이 입금되면 예약금과 입금자명 확인 후<br />홈페이지에서 그 예약이 알아서 확정으로 넘어갑니다.
          </p>
          {/* 처리 내역 도해. ⚠️ 실제 로그가 아니다. 사람 이름·계좌·금액을 넣지 않는다.
              흐름도가 아니라 줄로 그린 이유: 흐름도는 성공 경로만 그리게 되는데,
              줄이면 "자동으로 안 되는 것"까지 같은 형식으로 나란히 놓을 수 있다. */}
          <figure className="swmock reveal" style={{ marginBottom: 18 }}>
            <p className="ftitle">이런 순서로 지나갑니다</p>
            <span className="mocktag">처리 순서</span>
            <ol className="swlog" aria-label="입금 자동확인 처리 순서">
              <li><span className="lt">09:41</span><span className="lm">입금 알림 도착</span><span className="lc">받음</span></li>
              <li><span className="lt">09:41</span><span className="lm">이름과 금액 대조</span><span className="lc">일치</span></li>
              <li><span className="lt">09:41</span><span className="lm">예약 확정</span><span className="lc">자동</span></li>
              <li><span className="lt">09:41</span><span className="lm">손님에게 확정 문자</span><span className="lc">보냄</span></li>
              <li className="hold"><span className="lt">09:52</span><span className="lm">이름이 다르게 들어온 건 보류</span><span className="lc">사장님 확인</span></li>
            </ol>
            <figcaption>사장님이 매번 핸드폰을 들여다보지 않아도 됩니다.</figcaption>
          </figure>

          <div className="ops">
            <div className="op reveal"><b>손으로 대조하던 일</b><span>통장 열어서 이름 맞춰보고, 관리자 들어가서 확정 누르고.</span></div>
            <div className="op reveal"><b>지금</b><span>입금 알림이 오면 맞는 예약을 찾아 확정까지 갑니다. 손님한테 확정 문자도 나갑니다.<br />사장님은 하실게 없습니다.</span></div>
          </div>

          {/* 힌트폰 — 저희가 실제로 만들어 쓰는 것. 락다운시티(태블릿 카드 태그식)와
              태초의 신부(코드 입력식) 두 가지를 매장에서 돌리고 있다.
              ⚠️ 없는 실적을 쓰지 않는다. 여기 적힌 것은 전부 지금 돌아가는 기능이다. */}
          <h3 className="reveal" style={{ margin: "48px 0 0", fontSize: 17, fontWeight: 800 }}>테마 안에서 손님이 보는 힌트폰 프로그램도 제작해드립니다.</h3>
          <p className="lead reveal" style={{ margin: "10px 0 18px" }}>
            힌트를 종이로 주거나 일일이 직원이 무전기로 힌트나 진행상황을 알려줄 필요가 없습니다. 
테블릿 1대로 진행상황과 가이드 남은시간 힌트까지 
 손님이 보는 화면과 직원이 보는 화면이 따로 있고, 
둘이 실시간으로 붙어 있습니다.
          </p>

          {/* ⭐ 힌트폰 도해 → **실제 화면 2장**으로 교체 (2026-08-20 사장님 지시)
              · 손님 태블릿 = 대기 화면(MISSION TRACKER SYSTEM). 진행 중 화면은 문제·힌트가 보여서 못 쓴다.
              · GM 뷰어 = 실제 운영 중인 화면. 폰 2대 연결·힌트 사용 횟수가 그대로 보인다.
              ⚠️ 뷰어 화면에는 락다운시티 **진행 단계 이름이 전부** 들어 있었다(안전가옥·소독실·박사방…).
                 공개 페이지에 그대로 올리면 손님이 미리 보는 스포일러라, 단계 이름만 '미션 01…' 로
                 바꿔서 찍었다. 화면 구조(체크·진행·힌트 사용 수)는 실물 그대로다. */}
          <div className="shots duo reveal">
            <figure className="shot">
              <p className="s-title">손님이 보는 태블릿</p>
              <div className="s-frame">
                <Image src="/images/business/shot-tablet.webp" alt="방 안 태블릿의 대기 화면. 테마 이름과 미션 트래커 표시가 보인다." width={1200} height={900} sizes="(max-width: 900px) 92vw, 560px" />
              </div>
              <figcaption>
                힌트를 종이로 주거나 직원이 문을 열고 들어갈 일이 없습니다. 남은 시간과 지금 할 일, 받은 힌트가 이 화면에 있습니다.
                <span className="s-stamp">락다운시티 방 안 태블릿 실제 화면</span>
              </figcaption>
            </figure>
            <figure className="shot">
              <p className="s-title">직원이 보는 뷰어</p>
              <div className="s-frame">
                <Image src="/images/business/shot-gmviewer.webp" alt="직원용 진행 뷰어. 연결된 태블릿 수와 남은 시간, 진행 단계와 힌트 사용 횟수가 보인다." width={1440} height={900} sizes="(max-width: 900px) 92vw, 560px" />
              </div>
              <figcaption>
                어느 방이 어디까지 왔는지 한 화면에서 보고, 필요하면 그 자리에서 힌트를 보냅니다. 태블릿이 꺼졌다 켜져도 진행과 남은 시간이 그대로 따라옵니다.
                <span className="s-stamp">실제 운영중인 관리자 뷰어 페이지 (진행 단계 이름은 스포일러라 가림)</span>
              </figcaption>
            </figure>
          </div>

          <div className="ops" style={{ marginTop: 18 }}>
            <div className="op reveal"><b>방 성격에 맞춰 만듭니다</b><span>카드를 대면 다음 할 일이 뜨는 방식, 코드를 넣으면 이야기가 오는 방식.<br />어떤 방식으로든 맞춤제작이 가능합니다.</span></div>
            <div className="op reveal"><b>온라인, 오프라인 버전 둘다 가능합니다.</b><span>필요에 따라서는 온라인버전으로,<br />오프라인 버전은 끊길 우려가 전혀 없습니다.</span></div>
            <div className="op reveal"><b>끊겨도 이어집니다</b><span>태블릿이 잠깐 꺼졌다 켜져도 어디까지 왔는지와 남은 시간이 그대로 따라옵니다.</span></div>
            <div className="op reveal"><b>진행 속도가 빠른지, 느린지 손님에게 정보 전달 가능</b><span>손님이 입력하는 힌트코드나 다른 방식으로 손님에게 지금 진행이 빠른지 느린지 정보를 줘서<br />손님이 능동적으로 테마진행을 할 수 있도록 만들어줍니다.</span></div>
          </div>

          <p className="note reveal">프로그램만 따로 도입하고 싶으신 분들은 운영프로그램만 상담도 가능합니다.</p>
        </section>
        {/* 이 화면의 마무리 — 다음 범위로 넘기고, 문의로 받는다 */}
        <NextUp here={here} pick={pick} />

        {/* 문의 */}
        <section className="bz-sec" id="cta">
          <div className="ctabox reveal">
            <div className="kicker" style={{ justifyContent: "center" }}>CONTACT</div>
            <h2>컨설팅 문의하기</h2>
            <p className="lead center">새로운 테마도 좋고, 현재 운영중인 테마도 괜찮습니다. 
인테리어 리모델링, 장치, 문제. 설계, 운영 프로그램까지
 방탈출 매장에 필요한 모든 것을 편하게 문의해주세요 FANTASTRICK TEAM이 체계적으로 분석  및 검토 후에 
최적의 답변을 고객님께 전달드립니다!!</p>
            {sent ? (
              <div className="bzdone">
                <b>문의 잘 받았습니다.</b>
                <p>영업일 기준 하루 안에 전화 드립니다. 급하시면 <b>fantastrick@fantastrick.co.kr</b> 로도 연락 주세요.</p>
              </div>
            ) : (
              <>
                <div className="kinds" style={{ justifyContent: "center", margin: "22px 0 4px" }}>
                  {KINDS.map((k) => (
                    <button key={k} type="button" className={kind === k ? "on" : ""} onClick={() => setKind(k)}>{k}</button>
                  ))}
                </div>
                <form className="bzform" onSubmit={sendInquiry}>
                  <div>
                    <label htmlFor="bz-store">매장명 or 성명</label>
                    <input id="bz-store" maxLength={60} placeholder="○○이스케이프" autoComplete="organization"
                      value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="bz-tel">연락처</label>
                    <input id="bz-tel" inputMode="tel" maxLength={20} placeholder="010-0000-0000" autoComplete="tel"
                      value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="bz-rooms">규모</label>
                    <input id="bz-rooms" maxLength={40} placeholder="예: 방 3개"
                      value={form.rooms} onChange={(e) => setForm({ ...form, rooms: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="bz-area">지역</label>
                    <input id="bz-area" maxLength={40} placeholder="서울 강남"
                      value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
                  </div>
                  <div className="full">
                    <button type="submit" className="btn primary" style={{ width: "100%" }} disabled={sending}>
                      {sending ? "보내는 중…" : "문의하기"}
                    </button>
                  </div>
                </form>
                {formErr && <div className="bzerr">{formErr}</div>}
              </>
            )}
          </div>

          <div className="crossline reveal" style={{ marginTop: 22 }}>
            <p>브랜드 팝업이나 기업 교육처럼 방탈출 매장이 아닌 곳과의 협업도 가능합니다.</p>
            <Link prefetch={false} href="/business/collab">협업 이야기 보기 →</Link>
          </div>
        </section>
      </div></div>}

    </div>
  );
}
