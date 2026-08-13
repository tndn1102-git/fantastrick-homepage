"use client";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { THEMES, themeColor } from "@/lib/data";
import { formatDate } from "@/lib/util";
import type { Review } from "./types";

// 후기 목록은 **서버가 미리 그려서** initialReviews 로 넘겨준다(화면 튐 방지 — page.tsx 설명 참고).
// 그래서 여기서는 처음에 불러오지 않고, 후기를 새로 쓴 뒤에만 다시 불러온다.
export default function ReviewsClient({ initialReviews }: { initialReviews: Review[] }) {
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState<Review | null>(null);

  // 🔴 2026-08-13 — 손님이 직접 후기를 쓰는 기능을 없앴다(사장님 지시).
  //   여기 실리는 후기는 전부 **관리자가 동의를 받아 옮겨온 글**이다(블로그·네이버 등).
  //   그래서 작성 폼·[후기 쓰기] 버튼·다시 불러오기(reload)가 통째로 필요 없어졌고,
  //   목록도 서버가 그려준 것(initialReviews)만 쓰면 된다.
  //   ⚠️ 손님 접수 통로(POST /api/reviews)도 함께 닫았다. 화면만 숨기면 통로는 열려 있게 된다.

  // 테마 고르기는 **이미 받아둔 목록에서 걸러내기만** 한다.
  //   전에는 칩을 누를 때마다 서버에 다시 물어봐서 (1) 목록이 잠깐 사라졌다 나타나며 화면이 튀고
  //   (2) 느린 인터넷에선 몇 초씩 기다렸다. 지금은 누르는 즉시 바뀐다.
  const shown = useMemo(
    () => (filter === "all" ? initialReviews : initialReviews.filter((r) => r.theme_id === filter)),
    [initialReviews, filter],
  );

  return (
    <div className="formwrap" style={{ maxWidth: 860 }}>
      <div className="page-top" />
      <h1 className="title" style={{ margin: 0 }}>플레이 후기</h1>
      <p className="lead" style={{ margin: "6px 0 18px" }}>
        실제 플레이하신 분들이 남겨주신 글을 <b>본인 동의를 받아</b> 옮겨온 후기예요. 카드를 누르면 전문을 볼 수 있어요.
      </p>

      {/* 필터 — aria-pressed 로 "지금 이게 눌린 상태"를 화면낭독기에도 알린다(색만으로 알리지 않기) */}
      <div className="filters">
        <button
          className={"chip" + (filter === "all" ? " on" : "")}
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
        >
          전체
        </button>
        {THEMES.map((t) => (
          <button
            key={t.id}
            className={"chip chip-th" + (filter === t.id ? " on" : "")}
            style={{ "--th": t.color } as CSSProperties}
            aria-pressed={filter === t.id}
            onClick={() => setFilter(t.id)}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {shown.length === 0 ? (
        <div className="notice info">
          {initialReviews.length === 0
            ? "아직 등록된 후기가 없어요."
            : "이 테마의 후기는 아직 없어요."}
        </div>
      ) : (
        /* 🔴 2026-08-13 — 명함 크기 카드로 바꿈(사장님 지시).
           전에는 후기 하나가 화면 폭을 다 쓰고 본문도 통째로 펼쳐져서, 긴 블로그 후기 한 건이
           화면을 다 먹었다. 여러 건이 쌓이면 스크롤만 길어지고 뭐가 있는지 한눈에 안 보인다.
           → 작은 카드로 늘어놓고(4줄까지만 미리보기), 누르면 전문을 팝업으로 띄운다. */
        <div className="rev-cards">
          {shown.map((r) => (
            <button key={r.id} type="button" className="rev-card" onClick={() => setOpen(r)}
                    style={{ "--th": themeColor(r.theme_id) } as CSSProperties}
                    aria-label={`${r.name}님의 ${r.theme_name} 후기 전문 보기`}>
              <div className="rc-top">
                <span className="rc-theme">{r.theme_name}</span>
                {/* 카드 안에서는 출처를 **글자로만** 둔다. 버튼 안에 링크를 넣으면
                    누를 때마다 어느 쪽이 눌린 건지 엉키고, 화면 읽어주기도 깨진다.
                    원문으로 가는 링크는 아래 전문 팝업에 있다. */}
                {r.source && r.source !== "자체" && <span className="rc-src">{r.source}</span>}
              </div>
              <p className="rc-body">{r.body}</p>
              <div className="rc-foot">
                <span className="rc-who">{r.name}</span>
                <span className="rc-date">{formatDate(r.created_at.slice(0, 10))}</span>
              </div>
              <span className="rc-more">전문 보기 →</span>
            </button>
          ))}
        </div>
      )}

      {open && <ReviewModal r={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

/* 후기 전문 팝업 — 카드를 누르면 열린다.
   ESC·바깥 클릭으로 닫히고, 열려 있는 동안 뒤 화면은 스크롤되지 않는다
   (안 막으면 팝업 안에서 손가락을 굴릴 때 뒤 목록이 같이 움직여 어지럽다). */
function ReviewModal({ r, onClose }: { r: Review; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal rev-modal" role="dialog" aria-modal="true" style={{ "--th": themeColor(r.theme_id) } as CSSProperties} aria-label={`${r.name}님의 후기`}>
        <button className="close-x" onClick={onClose} aria-label="닫기">×</button>
        <div className="rm-theme">{r.theme_name}</div>
        <div className="rm-who">
          {r.name}
          {r.phone && <span className="rm-phone">{r.phone}</span>}
          <span className="rm-date">{formatDate(r.created_at.slice(0, 10))}</span>
        </div>
        {/* 본문은 줄바꿈을 살린다 — 블로그에서 옮겨온 글은 문단이 나뉘어 있는데
            그냥 두면 한 덩어리로 붙어 읽기 어렵다. */}
        <div className="rm-body">{r.body}</div>
        {/* 출처 — 원문 주소가 있으면 **눌러서 원글로 갈 수 있게** 한다.
            글을 써주신 분께 방문이 돌아가야 인용이지, 가져오기가 아니다.
            rel 의 nofollow 는 "이 글의 원본은 우리가 아니다"를 검색엔진에 알리는 표시다. */}
        <div className="rm-foot">
          {r.source && r.source !== "자체" ? (
            r.source_url ? (
              <a href={r.source_url} target="_blank" rel="nofollow noopener noreferrer" className="rev-src">
                {r.source} 원문 보기 ↗
              </a>
            ) : (
              <span style={{ fontSize: 12, color: "var(--faint)", fontWeight: 600 }}>출처 · {r.source}</span>
            )
          ) : <span />}
          <button className="btn sm" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}
