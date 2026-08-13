"use client";
import { useEffect, useRef, useState } from "react";
import { THEMES } from "@/lib/data";
import { BOOKING_INFO } from "@/lib/theme-content";

/* 오른쪽 아래 상담 챗봇 (2026-08-13)
 *
 * [왜 AI(LLM)가 아닌가]
 *   환불 규정·가격은 손님이 돈을 걸고 읽는 정보다. AI가 그럴듯하게 틀리면 실제 분쟁이 된다.
 *   그래서 답은 전부 **코드에 있는 실제 운영 데이터**(THEMES·BOOKING_INFO)에서 그대로 가져오고,
 *   데이터가 못 답하는 질문은 사람(전화·카톡)으로 넘긴다. API 비용도 0원이다.
 *
 * [답변을 지어내지 않는다]
 *   환불 문구는 BOOKING_INFO.refund 를 한 글자도 안 바꾸고 보여준다.
 *   여기 하드코딩된 안내(예약 오픈 저녁 9시 등)를 고칠 일이 생기면 팝업 공지와 함께 고칠 것.
 */

/* 🔴 2026-08-13 — 카카오톡·문자 문의 버튼을 **없앴다**(사장님 지시).
   밖으로 내보내면 사장님이 카톡·문자·전화를 돌아다니며 확인해야 하고,
   **답을 했는지 안 했는지가 아무 데도 안 남는다.**
   대신 여기서 바로 [1:1 문의 남기기] 로 받아 관리자 › 문의 탭에 쌓는다.
   ⚠️ 카톡 버튼을 다시 넣고 싶어지면, 답변 기록이 사라지는 문제부터 해결할 것. */

type Msg = { who: "bot" | "me"; text?: string; jsx?: React.ReactNode };

const TOPICS = [
  { id: "open", label: "예약은 언제 열리나요?" },
  { id: "price", label: "가격·예약금" },
  { id: "refund", label: "환불 규정" },
  { id: "themes", label: "테마 안내" },
  { id: "way", label: "오시는 길·주차" },
  { id: "manage", label: "예약 확인·취소" },
  { id: "human", label: "1:1 문의 남기기" },
] as const;
type TopicId = (typeof TOPICS)[number]["id"];

/* 자유 입력 → 주제 찾기. 단순 낱말 매칭 — 못 알아들으면 솔직하게 사람 연결로 넘긴다. */
function route(text: string): TopicId | null {
  const t = text.replace(/\s/g, "");
  if (/환불|취소수수료|위약/.test(t)) return "refund";
  if (/취소|변경|확인|비밀번호|계좌/.test(t)) return "manage";
  if (/가격|얼마|비용|요금|예약금|입금|결제/.test(t)) return "price";
  if (/오픈|열려|열리|언제부터|9시|자정|선착순/.test(t)) return "open";
  if (/주차|오시|위치|찾아|지하철|신논현|어디|길/.test(t)) return "way";
  if (/테마|추천|공포|난이도|인원|몇명|몇인|장르/.test(t)) return "themes";
  if (/전화|상담|사람|카톡|카카오|문의/.test(t)) return "human";
  return null;
}

function Stars({ n }: { n: number }) {
  return <span aria-label={`난이도 5점 만점에 ${n}점`}>{"★".repeat(n)}{"☆".repeat(5 - n)}</span>;
}

/* 주제별 답변 — 전부 실제 데이터에서 */
function answer(id: TopicId): Msg[] {
  switch (id) {
    case "open":
      return [
        { who: "bot", text: "예약 창은 이용일 7일 전 저녁 9시에 열립니다.\n\n예) 8월 20일(수) 예약 → 8월 13일(수) 저녁 9시 오픈\n\n예약 캘린더에서 날짜를 클릭하시면 며칠에 열리는지 바로 보여드려요." },
        { who: "bot", jsx: <a className="cw-link" href="/reserve">예약하러 가기 →</a> },
      ];
    case "price":
      return [
        {
          who: "bot",
          jsx: (
            <div>
              예약금은 테마마다 달라요. 남은 금액은 매장에서 결제하시면 됩니다.
              <ul className="cw-ul">
                {THEMES.map((t) => (
                  <li key={t.id}>{t.name} ({t.storeTag}) — 예약금 {t.deposit.toLocaleString()}원</li>
                ))}
              </ul>
              인원별 전체 금액은 자주 묻는 질문에 표로 정리돼 있어요.
            </div>
          ),
        },
        { who: "bot", jsx: <a className="cw-link" href="/faq">인원별 가격표 보기 →</a> },
      ];
    case "refund":
      return [
        { who: "bot", text: BOOKING_INFO.refund.join("\n\n") },
        { who: "bot", jsx: <a className="cw-link" href="/reservation">예약 취소하러 가기 →</a> },
      ];
    case "themes":
      return [
        {
          who: "bot",
          jsx: (
            <div>
              지금 운영 중인 테마예요.
              <ul className="cw-ul">
                {THEMES.map((t) => (
                  <li key={t.id}>
                    <a className="cw-a" href={`/rooms/${t.id}`}>{t.name}</a> ({t.storeTag}) · {t.minutes}분 · <Stars n={t.difficulty} />
                  </li>
                ))}
              </ul>
              이름을 누르면 시놉시스·가격·주의사항까지 보실 수 있어요.
            </div>
          ),
        },
      ];
    case "way":
      return [
        { who: "bot", text: `${BOOKING_INFO.subway}\n\n${BOOKING_INFO.parking[0]}\n${BOOKING_INFO.parking[2]}` },
        { who: "bot", jsx: <a className="cw-link" href="/about">지점별 주소·약도 보기 →</a> },
      ];
    case "manage":
      return [
        { who: "bot", text: "예약 확인·취소·시간 변경은 홈페이지에서 직접 하실 수 있어요.\n\n예약하실 때 쓰신 이름 · 전화번호 · 비밀번호 4자리로 조회하시면 됩니다. 환불 계좌도 그 화면에서 받으니 따로 연락 주지 않으셔도 돼요." },
        { who: "bot", jsx: <a className="cw-link" href="/reservation">예약 조회·취소 →</a> },
      ];
    case "human":
      return [
        {
          who: "bot",
          jsx: (
            <div>
              게임 진행 중에는 전화를 못 받을 때가 있어요.
              <b> 아래에 남겨주시면 확인하는 대로 문자로 답드립니다.</b>
              <ul className="cw-ul">
                <li>1호점 <a className="cw-a" href="tel:01045470481">010-4547-0481</a></li>
                <li>2호점 <a className="cw-a" href="tel:01049950482">010-4995-0482</a></li>
                <li>TGC <a className="cw-a" href="tel:01055360483">010-5536-0483</a></li>
              </ul>
              방탈출 제작·장치 문의는 <a className="cw-a" href="/business">비즈니스</a>에서 남겨주세요.
            </div>
          ),
        },
        { who: "bot", jsx: <InquiryForm /> },
      ];
  }
}

/* [1:1 문의 남기기] 폼 — 말풍선 안에 그대로 들어간다.
   보낸 뒤에는 폼을 지우고 "받았습니다"만 남긴다(두 번 보내는 걸 막는다). */
function InquiryForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  if (done) {
    return (
      <div className="cw-ok">
        <b>문의를 받았습니다 ✅</b>
        <br />확인하는 대로 <b>{phone ? formatPhoneLoose(phone) : "남겨주신 번호"}</b> 로 답드릴게요.
        <br />급하시면 1호점 <a className="cw-a" href="tel:01045470481">010-4547-0481</a> 로 전화 주세요.
      </div>
    );
  }

  async function submit() {
    setErr("");
    if (!name.trim()) return setErr("이름을 입력해 주세요.");
    if (phone.replace(/[^0-9]/g, "").length < 10) return setErr("연락처를 정확히 입력해 주세요.");
    if (message.trim().length < 5) return setErr("문의 내용을 조금만 더 적어주세요.");
    setBusy(true);
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, message }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) { setErr(j.error || "잠시 후 다시 시도해 주세요."); return; }
      setDone(true);
    } catch {
      setErr("연결이 불안정합니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cw-form">
      <label>
        이름
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" maxLength={30} />
      </label>
      <label>
        연락처
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="010-0000-0000"
          inputMode="numeric"
          maxLength={13}
        />
      </label>
      <label>
        문의 내용
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="예) 8월 20일 4명인데 예약이 가능할까요?"
          rows={3}
          maxLength={1000}
        />
      </label>
      {err && <p className="cw-err">{err}</p>}
      <button className="cw-send" onClick={submit} disabled={busy}>
        {busy ? "보내는 중…" : "문의 남기기"}
      </button>
      <span className="cw-note">남겨주신 번호는 답변에만 사용하고 그 뒤 지웁니다.</span>
    </div>
  );
}

/* 입력 중인 번호를 보기 좋게. util 의 formatPhone 은 서버 저장용(숫자만)이라 여기선 가볍게 처리. */
function formatPhoneLoose(v: string): string {
  const d = v.replace(/[^0-9]/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return v;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { who: "bot", text: "안녕하세요, 판타스트릭입니다! 🗝️\n궁금하신 것을 눌러주세요. 직접 입력하셔도 돼요." },
  ]);
  const [input, setInput] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);

  // 새 말풍선이 생기면 맨 아래로
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [msgs, open]);

  // ESC 로 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function pick(id: TopicId, label: string) {
    setMsgs((m) => [...m, { who: "me", text: label }, ...answer(id)]);
  }

  function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const id = route(text);
    if (id) {
      setMsgs((m) => [...m, { who: "me", text }, ...answer(id)]);
    } else {
      // 못 알아들었으면 아는 척하지 않는다 — 솔직하게 사람에게 넘긴다.
      setMsgs((m) => [
        ...m,
        { who: "me", text },
        { who: "bot", text: "제가 답해드릴 수 있는 범위를 벗어났어요. 아래 버튼에서 골라주시거나, 전화 주시면 바로 도와드릴게요!" },
        ...answer("human"),
      ]);
    }
  }

  return (
    <>
      <button
        className={"cw-fab" + (open ? " on" : "")}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "상담 창 닫기" : "상담 챗봇 열기"}
        aria-expanded={open}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3C7 3 3 6.6 3 11c0 2.4 1.2 4.5 3.1 6L5.5 21l4-2.2c.8.2 1.6.3 2.5.3 5 0 9-3.6 9-8.1S17 3 12 3Z" fill="currentColor"/></svg>
        )}
      </button>

      {open && (
        <div className="cw-panel" role="dialog" aria-label="판타스트릭 상담 챗봇">
          <div className="cw-head">
            <b>판타스트릭 상담</b>
            <span>실제 운영 규정으로 답해드려요</span>
          </div>
          <div className="cw-body" ref={bodyRef}>
            {msgs.map((m, i) => (
              <div key={i} className={"cw-msg " + m.who}>
                {m.text ? <span style={{ whiteSpace: "pre-line" }}>{m.text}</span> : m.jsx}
              </div>
            ))}
          </div>
          <div className="cw-chips">
            {TOPICS.map((t) => (
              <button key={t.id} onClick={() => pick(t.id, t.label)}>{t.label}</button>
            ))}
          </div>
          <div className="cw-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="궁금한 것을 입력해 보세요"
              aria-label="질문 입력"
            />
            <button onClick={send} aria-label="보내기">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12L20 4l-4 8 4 8-16-8Z" fill="currentColor"/></svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
