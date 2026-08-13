"use client";

/* 최상위 안전망 — 뼈대(layout)째 터졌을 때만 나온다. error.tsx 와 같은 취지.
   여기서는 html/body 를 직접 그려야 한다(뼈대가 이미 죽은 상태라서). */
export default function GlobalError({ error }: { error: Error }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "'Malgun Gothic', sans-serif", background: "#0d1220", color: "#e9f0ff", textAlign: "center", padding: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, marginBottom: 10 }}>화면을 불러오지 못했어요</h2>
          <p style={{ color: "#a9b8d6", fontSize: 14.5, lineHeight: 1.7, marginBottom: 18 }}>
            일시적인 문제일 수 있어요. 아래 버튼을 눌러 새로고침해 주세요.
          </p>
          <button
            onClick={() => location.reload()}
            style={{ padding: "11px 22px", borderRadius: 10, border: "none", background: "#2a63c9", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
          >
            새로고침
          </button>
          <p style={{ fontSize: 11, color: "#5a6a8c", marginTop: 16 }}>{String(error?.message ?? "").slice(0, 120)}</p>
        </div>
      </body>
    </html>
  );
}
