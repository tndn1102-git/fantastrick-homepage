"use client";
import { useRef, useState } from "react";

/* 세계관 페이지의 홍보 영상 플레이어.
   기본 <video controls> 는 재생 버튼이 왼쪽 아래에 작게 붙어 영상인 줄 모른다는
   사장님 지적(2026-08-22) → 시작 전에는 화면 전체를 덮는 큰 중앙 재생 버튼을 얹는다.
   누르면 버튼이 사라지고 재생 + 그때부터 일반 컨트롤(재생바)이 나타난다. */
export default function WorldVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const start = () => {
    setStarted(true);
    // controls 가 켜진 뒤 재생되도록 다음 틱에 — 같은 틱에 부르면 일부 브라우저가 무시한다
    requestAnimationFrame(() => ref.current?.play());
  };
  return (
    <div className="uv-vwrap">
      <video
        ref={ref}
        controls={started}
        preload="none"
        playsInline
        poster="/videos/redcrown-poster.webp"
        width={720}
        height={404}
        onPlay={() => setStarted(true)}
      >
        <source src="/videos/redcrown-reel.mp4" type="video/mp4" />
        이 브라우저는 영상을 재생하지 못합니다.
      </video>
      {!started && (
        <button type="button" className="uv-vplay" onClick={start} aria-label="영상 재생">
          <span className="ring" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" /></svg>
          </span>
          <span className="cap">▶ 영상 재생 · 59초</span>
        </button>
      )}
    </div>
  );
}
