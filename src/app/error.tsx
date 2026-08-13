"use client";
import { useEffect } from "react";

/* 화면이 터졌을 때의 안전망 (2026-08-13)
 *
 * 왜 필요한가:
 *   배포를 하고 나면, 그 전부터 열려 있던 옛 화면이 서버에 없는 옛 부품을 찾다 터진다.
 *   기본 화면은 영어로 "Application error: a client-side exception has occurred" 만 떠서
 *   손님도 사장님도 뭘 해야 할지 모른다 (2026-08-13 관리자에서 실제 발생).
 *
 * 무엇을 하나:
 *   ① 처음 터진 거면 **말없이 새로고침 한 번** — 옛 부품 문제는 이걸로 대부분 자가 치유된다.
 *   ② 새로고침해도 또 터지면(진짜 오류) 그때만 한국어 안내 화면을 보여준다.
 *      무한 새로고침에 빠지지 않게 sessionStorage 로 1회만 시도한다.
 */
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("[화면 오류]", error);
    try {
      const KEY = "fx-auto-reloaded";
      if (!sessionStorage.getItem(KEY)) {
        sessionStorage.setItem(KEY, "1");
        location.reload();
      }
    } catch {
      /* sessionStorage 가 막혀 있으면 자동 새로고침 없이 안내만 */
    }
  }, [error]);

  return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>화면을 불러오지 못했어요</h2>
        <p style={{ color: "#888", fontSize: 14.5, lineHeight: 1.7, marginBottom: 18 }}>
          일시적인 문제일 수 있어요. 아래 버튼을 눌러 다시 시도해 주세요.<br />
          계속 반복되면 새로고침(Ctrl+F5) 후에도 같은지 확인해 주세요.
        </p>
        <button
          onClick={() => { try { sessionStorage.removeItem("fx-auto-reloaded"); } catch {} location.reload(); }}
          style={{ padding: "11px 22px", borderRadius: 10, border: "none", background: "#2a63c9", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
        >
          다시 시도
        </button>
        <button
          onClick={() => reset()}
          style={{ padding: "11px 22px", borderRadius: 10, border: "1px solid #ccc", background: "transparent", color: "inherit", fontWeight: 700, fontSize: 15, cursor: "pointer", marginLeft: 8 }}
        >
          그냥 이어서 보기
        </button>
      </div>
    </div>
  );
}
