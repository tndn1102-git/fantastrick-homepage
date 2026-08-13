"use client";
import { useEffect, useRef, useState } from "react";

// 섹션 전환부를 지나는 인페이지 회로 밴드 — cantor8.io 정밀 재현.
//  · 페이지에 박혀 콘텐츠와 함께 스크롤(in-page). fixed 아님.
//  · 은은한 회로 트레이스(base) + 밝은 dash(pulse)가 같은 경로에 겹침(거의 평행한 두 선 = 한 줄기).
//  · pulse 의 stroke-dashoffset 이 "이 밴드가 화면을 지나는 진행률"에 스크럽 → 스크롤로만 빛이 흐른다.
//  · 데스크톱=가로 풀폭 밴드 / 모바일(세로로 긴 화면)=세로 트레이스로 전환(가로는 모바일서 압축돼 뭉개짐).

function toPath(wp: number[][], r = 24): string {
  let s = `M${wp[0][0]} ${wp[0][1]}`;
  for (let i = 1; i < wp.length - 1; i++) {
    const [x0, y0] = wp[i - 1], [x, y] = wp[i], [x1, y1] = wp[i + 1];
    const ix = Math.sign(x - x0), iy = Math.sign(y - y0), ox = Math.sign(x1 - x), oy = Math.sign(y1 - y);
    s += ` L${x - ix * r} ${y - iy * r} Q${x} ${y} ${x + ox * r} ${y + oy * r}`;
  }
  const last = wp[wp.length - 1];
  s += ` L${last[0]} ${last[1]}`;
  return s;
}
// 데스크톱: 가로 풀폭 + 둥근 계단(viewBox 1440×500)
const BASE_DESK = [[-80, 388], [372, 388], [372, 262], [760, 262], [760, 140], [1140, 140], [1140, 44], [1520, 44]];
// 모바일: 세로 우세 + 둥근 꺾임(viewBox 390×760)
const BASE_MOB = [[300, -60], [300, 250], [224, 250], [224, 360], [300, 360], [300, 820]];

export default function CircuitFlow({ flip = false }: { flip?: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pulses = useRef<(SVGPathElement | null)[]>([]);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width:640px)");
    const on = () => setMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const svg = svgRef.current;
    if (!svg) return;
    let ticking = false;
    const apply = () => {
      ticking = false;
      const r = svg.getBoundingClientRect();
      const vh = window.innerHeight;
      const prog = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      pulses.current.forEach((pa, i) => {
        if (pa) pa.style.strokeDashoffset = String(-(1000 * (1 - prog)) - i * 120);
      });
    };
    // 🔴 2026-08-13 — 화면 밖에 있을 때는 아예 계산하지 않는다.
    //   전에는 페이지 어디를 굴리든 스크롤 프레임마다 getBoundingClientRect() 를 부르고
    //   SVG 선(stroke-dashoffset)을 다시 그렸다. 이 그림은 페이지 한참 아래에 있어서
    //   **대부분의 스크롤 구간에서는 보이지도 않는데 계속 일했다.**
    //   느린 PC·폰일수록 이 낭비가 그대로 끊김으로 나온다.
    let visible = false;
    const onScroll = () => { if (visible && !ticking) { ticking = true; requestAnimationFrame(apply); } };
    const io = new IntersectionObserver(
      ([e]) => { visible = !!e?.isIntersecting; if (visible) apply(); },
      { rootMargin: "120px 0px" }, // 화면에 들어오기 조금 전부터 켠다(들어오는 순간 툭 튀지 않게)
    );
    io.observe(svg);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [mobile]);

  const vbW = mobile ? 390 : 1440;
  const vbH = mobile ? 760 : 500;
  const base = mobile ? BASE_MOB : BASE_DESK;
  const pair = base.map(([x, y]) => (mobile ? [x - 15, y + 8] : [x + 18, y + 15]));
  let routes = [base, pair];
  if (flip) routes = routes.map((rt) => rt.map(([x, y]) => [vbW - x, y]));
  const gid = `cf${flip ? "R" : "L"}${mobile ? "M" : "D"}`;

  return (
    <svg className={`cflow${mobile ? " m" : ""}`} viewBox={`0 0 ${vbW} ${vbH}`} preserveAspectRatio="none" aria-hidden="true" ref={svgRef}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2={mobile ? "0" : "1"} y2={mobile ? "1" : "0"}>
          <stop offset="0" stopColor="#8fb6ff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#8fb6ff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#8fb6ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {routes.map((wp, i) => {
        const d = toPath(wp);
        return (
          <g key={i}>
            <path d={d} className="cf-rail" stroke={`url(#${gid})`} />
            <path d={d} ref={(el) => { pulses.current[i] = el; }} className="cf-pulse" pathLength={1000} strokeDasharray="130 870" />
          </g>
        );
      })}
    </svg>
  );
}
