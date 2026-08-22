/* 🖊 세계관(아벨 연구소) 페이지 문구를 **화면에서 바로 고치는 도구** (내 컴퓨터 전용)
 * scripts/edit-business.mjs 를 복제해 대상만 바꾼 것(2026-08-22). 동작·함정·백업 방식 동일.
 * ─────────────────────────────────────────────────────────────────────────
 *   node scripts/edit-world.mjs
 *
 * 하는 일
 *   ① 이 컴퓨터에서 홈페이지를 띄운다(고치면 바로 화면에 반영되는 개발 모드)
 *   ② 그 화면을 한 겹 감싸 **글자를 클릭하면 고칠 수 있게** 만든다
 *   ③ [저장]을 누르면 실제 소스(src/app/w/[key]/page.tsx)에 그대로 적어 넣는다
 *   ④ 크롬이 자동으로 열린다
 *
 * [왜 만들었나]
 *   메모장으로 문구를 주고받았더니 **어느 글자가 화면 어디인지 매칭이 안 돼** 고치기 어려웠다
 *   (2026-08-19 사장님). 화면에서 보면서 그 자리를 바로 고치는 게 맞다.
 *
 * ⚠️ 이 도구는 **내 컴퓨터에서만** 돈다. 라이브 사이트는 안 건드린다.
 *    다 고치신 뒤 "배포해" 하시면 그때 올라간다.
 * ⚠️ 글자를 **원문 그대로 찾아 바꾸는** 방식이다. 그래서 못 바꾸는 경우가 있다:
 *      · 숫자가 코드로 계산돼 들어가는 문장(예: 금액 합계)
 *      · 같은 문장이 페이지에 여러 번 나오는 경우
 *    그런 건 저장할 때 "못 고침"으로 알려준다 — 그 문장만 말씀해주시면 손으로 고친다.
 * ⚠️ 끄는 법: 이 창에서 Ctrl+C
 */
import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const APP_PORT = 3461;   // 홈페이지(개발 모드)
const EDIT_PORT = 3462;  // 고치기 도구
const TARGET = "src/app/w/[key]/page.tsx";
/* 열쇠는 lib/world.ts 가 정본 — 거기서 읽어 온다(하드코딩하면 열쇠를 갈 때 이 도구가 낡는다). */
const KEY_MATCH = fs.readFileSync("src/lib/world.ts", "utf8").match(/"(abel-[0-9a-f]+)"/);
if (!KEY_MATCH) { console.error("src/lib/world.ts 에서 열쇠를 못 찾았습니다."); process.exit(1); }
const PAGE = `/w/${KEY_MATCH[1]}`;

if (!fs.existsSync(TARGET)) { console.error(`${TARGET} 을 찾을 수 없습니다. 프로젝트 폴더에서 실행하세요.`); process.exit(1); }

/* ── ① 홈페이지 띄우기 ── */
console.log("홈페이지를 띄우는 중입니다… (처음엔 30초쯤 걸립니다)");
/* ⚠️ 빌드 폴더를 따로 쓴다(.next-edit). 같은 .next 를 쓰면 배포용 빌드와 부딪혀
   화면이 500 으로 깨지고, 도구를 껐다 켜는 사이 고치던 내용이 날아간다(2026-08-20 두 번 발생). */
const dev = spawn("npx", ["next", "dev", "-p", String(APP_PORT)], { shell: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NEXT_DIST_DIR: ".next-edit-w" } });
dev.stdout.on("data", (d) => { const s = String(d); if (/Ready|error|Error/.test(s)) process.stdout.write("  " + s); });
dev.stderr.on("data", (d) => process.stderr.write("  " + d));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function ready() {
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch(`http://127.0.0.1:${APP_PORT}${PAGE}`); if (r.ok) return true; } catch { /* 아직 */ }
    await wait(1000);
  }
  return false;
}

/* ── ③ 저장: 화면에서 고친 글자를 소스에 적어 넣는다 ── */
function applyEdits(edits) {
  /* ⚠️ 무엇보다 먼저 **받은 그대로 파일에 남긴다.**
     2026-08-19 사고: 여러 줄이 한 덩어리인 표 칸을 못 바꿔서 11곳이 실패했는데,
     기록에 "원문"만 남기고 **사장님이 새로 쓰신 글자를 안 남겨서** 되살릴 뻔했다.
     이제는 못 바꾸더라도 아래 파일에 그대로 남으므로 절대 안 날아간다. */
  const backupDir = "docs/_edits";
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date(Date.now() + 9 * 3600e3).toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backup = path.join(backupDir, `수정-${stamp}.json`);
  fs.writeFileSync(backup, JSON.stringify(edits, null, 1), "utf8");

  let src = fs.readFileSync(TARGET, "utf8");
  const done = [], failed = [];
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  /** 한 조각을 소스에서 찾아 바꾼다. 바꿨으면 true. */
  /** 줄바꿈을 소스에 맞는 형태로 바꾼다.
   *  JSX 글자 자리( >여기< )면 <br /> 로, 따옴표 안 글자면 띄어쓰기로 둔다.
   *  ⚠️ 이걸 안 하면 엔터로 나눈 줄이 화면에서 **한 줄로 붙어** 나온다(JSX 는 줄바꿈을 공백으로 본다). */
  function lineBreaks(from, to) {
    if (!to.includes("\n")) return to;
    const at = src.indexOf(from);
    const before = at > 0 ? src.slice(Math.max(0, at - 40), at).replace(/\s+$/, "") : "";
    const parts = to.split("\n").map((x) => x.trim()).filter(Boolean);
    return before.endsWith(">") ? parts.join("<br />") : parts.join(" ");
  }

  function one(from, rawTo) {
    const to = lineBreaks(from, rawTo);
    if (!from || from === to) return true;
    // ① 글자 그대로 한 곳
    let n = src.split(from).length - 1;
    if (n === 1) { src = src.replace(from, to); return true; }
    // ② 줄바꿈·공백만 다른 경우
    const loose = new RegExp(from.split(/\s+/).map(esc).join("\\s+"), "g");
    const hit = src.match(loose) || [];
    if (hit.length === 1) { src = src.replace(loose, to); return true; }
    /* ③ 같은 문장이 여러 곳 — 세 범위(통째로·장치·프로그램)에 같은 문구가 나란히 쓰인 자리다.
          한 곳만 고르는 근거가 없고, 한 곳만 바뀌면 셋이 서로 어긋나 보인다. → 전부 바꾸고 알린다. */
    if (n > 1) { src = src.split(from).join(to); return `같은 문장 ${n}곳을 모두 바꿈`; }
    if (hit.length > 1) { src = src.replace(loose, to); return `같은 문장 ${hit.length}곳을 모두 바꿈`; }
    return false;
  }

  for (const { original, updated } of edits) {
    const from = String(original ?? "").replace(/\r/g, "").trim();
    const to = String(updated ?? "").replace(/\r/g, "").trim();
    if (!from || from === to) continue;

    const r = one(from, to);
    if (r) { done.push({ from, to, note: typeof r === "string" ? r : "" }); continue; }

    /* 여러 줄이 한 덩어리인 칸(표의 한 행 등)은 소스에 그런 한 덩어리로 존재하지 않는다.
       줄 수가 같으면 **줄끼리 짝지어** 한 줄씩 바꾼다. */
    const a = from.split("\n").map((x) => x.trim()).filter(Boolean);
    const b = to.split("\n").map((x) => x.trim()).filter(Boolean);
    if (a.length > 1 && a.length === b.length) {
      const sub = [];
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) sub.push([a[i], b[i]]);
      const okAll = sub.every(([x, y]) => one(x, y));
      if (okAll) { done.push({ from: a.join(" / "), to: b.join(" / "), note: "줄 단위로 바꿈" }); continue; }
      failed.push({ from, to, why: "여러 줄 중 일부를 못 찾음" });
      continue;
    }
    /* 줄 수가 달라진 경우(엔터로 줄을 더 넣으신 경우)도 살린다 —
       첫 줄은 제목, 나머지는 <br /> 로 이어 한 조각으로 바꾼다. */
    if (a.length > 1 && b.length > 1 && a.length !== b.length) {
      if (one(a[0], b[0]) && one(a.slice(1).join(" "), b.slice(1).join("\n"))) {
        done.push({ from: a.join(" / "), to: b.join(" / "), note: "줄 수가 달라져 이어 붙임" });
        continue;
      }
    }
    failed.push({ from, to, why: a.length !== b.length && a.length > 1 ? `줄 수가 달라짐(${a.length}줄 → ${b.length}줄)` : "소스에서 못 찾음(코드로 만들어지는 글자일 수 있음)" });
  }
  if (done.length) fs.writeFileSync(TARGET, src, "utf8");
  return { done, failed, backup };
}

/* ── ② 화면을 감싸 고칠 수 있게 만드는 부분 ── */
const INJECT = `
<style>
  [data-ed]{outline:1px dashed rgba(0,140,255,.35);outline-offset:2px;cursor:text;transition:outline-color .15s}
  [data-ed]:hover{outline-color:rgba(0,140,255,.9)}
  [data-ed][data-dirty="1"]{outline:2px solid #f59e0b;background:rgba(245,158,11,.10)}
  #edbar{position:fixed;left:50%;transform:translateX(-50%);bottom:18px;z-index:2147483647;
    display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:14px;
    background:#0b1220;color:#e8eefc;box-shadow:0 12px 40px -10px rgba(0,0,0,.6);
    font:600 14px/1.2 system-ui,-apple-system,"Malgun Gothic",sans-serif}
  #edbar b{color:#ffd479}
  #edbar button{font:inherit;padding:8px 14px;border-radius:10px;border:0;cursor:pointer}
  #edsave{background:#2563eb;color:#fff}
  #edundo{background:transparent;color:#9fb2d8;border:1px solid #33415c}
  #edmsg{position:fixed;left:50%;transform:translateX(-50%);bottom:74px;z-index:2147483647;max-width:min(720px,92vw);
    padding:12px 16px;border-radius:12px;background:#0b1220;color:#e8eefc;display:none;
    font:500 13px/1.6 system-ui,-apple-system,"Malgun Gothic",sans-serif;white-space:pre-wrap}
</style>
<div id="edbar"><span>고친 곳 <b id="edn">0</b>곳</span>
  <button id="edundo" type="button">되돌리기</button>
  <button id="edsave" type="button">저장</button></div>
<div id="edmsg"></div>
<script>
(function(){
  var KO=/[가-힣]/, edits=new Map();
  /* 고친 내용을 브라우저에 적어둔다 — 개발 모드는 파일이 바뀔 때마다 화면을 다시 그리는데,
     그때 DOM 에만 있던 수정분이 통째로 사라진다(2026-08-20 실제로 두 번 날아갔다). */
  var KEY='edit-world:'+location.pathname;
  function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ return {}; } }
  function keep(){ var o={}; edits.forEach(function(v,k){o[k]=v}); try{ localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){} }
  function clearKeep(){ try{ localStorage.removeItem(KEY); }catch(e){} }
  // 과거 버그로 저장된 빈 열쇠("") 청소 — 남아 있으면 숨은 요소들이 또 한꺼번에 바뀐다
  try{ var _o=JSON.parse(localStorage.getItem(KEY)||'{}'); if(''in _o){ delete _o['']; localStorage.setItem(KEY,JSON.stringify(_o)); } }catch(e){}
  window.addEventListener('beforeunload',function(e){ if(edits.size){ e.preventDefault(); e.returnValue=''; } });
  var SKIP={SCRIPT:1,STYLE:1,SVG:1,PATH:1,INPUT:1,TEXTAREA:1,SELECT:1,OPTION:1};
  function leafy(el){
    if(SKIP[el.tagName]) return false;
    if(el.closest('#edbar,#edmsg')) return false;
    var t=(el.textContent||'').trim();
    if(!t||t.length>300) return false;
    if(!KO.test(t) && !/[A-Za-z]{2,}/.test(t)) return false;  // 한글 또는 영단어가 있어야 편집 대상
    // 자식으로 다른 덩어리를 품고 있으면 그건 바깥 상자다 — 가장 안쪽만 고른다
    for(var i=0;i<el.children.length;i++){ var c=el.children[i];
      if(!/^(BR|B|I|EM|STRONG|SPAN|SMALL|U|SUP|SUB|MARK|CITE)$/.test(c.tagName)) return false; }
    return true;
  }
  function mark(){
    document.querySelectorAll('body *').forEach(function(el){
      if(el.hasAttribute('data-ed')) return;
      if(!leafy(el)) return;
      el.setAttribute('data-ed','1');
      var orig=(el.textContent||'').replace(/\s+/g,' ').trim();
      if(!orig){ el.removeAttribute('data-ed'); return; }   // 빈 열쇠 금지 — 숨은 요소끼리 한 묶음이 된다
      el.setAttribute('data-orig',orig);
      el.setAttribute('contenteditable','plaintext-only');
      el.addEventListener('input',function(){
        var o=el.getAttribute('data-orig'), n=(el.innerText||'').trim();
        if(!o) return;
        if(n===o){edits.delete(o);el.setAttribute('data-dirty','0');}
        else{edits.set(o,n);el.setAttribute('data-dirty','1');}
        document.getElementById('edn').textContent=edits.size;
        keep();
      });
      // 새로고침으로 날아간 내용 되살리기
      var kept=load()[el.getAttribute('data-orig')];
      if(kept!=null && kept!==(el.innerText||'').trim()){
        el.innerText=kept; edits.set(el.getAttribute('data-orig'),kept); el.setAttribute('data-dirty','1');
        document.getElementById('edn').textContent=edits.size;
      }
      /* 엔터로 줄을 바꾼다. 그냥 두면 링크·버튼 안에서 엔터가 씹히거나
         페이지 쪽 처리로 넘어가 아무 일도 안 일어난다(2026-08-20 사장님 지적). */
      el.addEventListener('keydown',function(e){
        if(e.key!=='Enter') return;
        e.preventDefault(); e.stopPropagation();
        document.execCommand('insertLineBreak');
        el.dispatchEvent(new Event('input',{bubbles:true}));
      });
      // 링크는 클릭하면 이동해버린다 — 고치는 동안 막는다
      el.addEventListener('click',function(e){ if(el.closest('a')) e.preventDefault(); });
    });
  }
  /* 화면이 다시 그려져 원래 글자로 돌아간 자리를 찾아 고친 값을 다시 넣는다. */
  /* 화면이 다시 그려져 원래 글자로 돌아간 자리를 찾아 고친 값을 다시 넣는다.
     ⚠️ 다시 넣는 동안에는 감시를 끈다 — 안 그러면 서로 물고 늘어져 화면이 멈춘다. */
  var busy=false, mo=null;
  function restore(){
    if(busy||!edits.size) return;
    busy=true; if(mo) mo.disconnect();
    try{
      document.querySelectorAll('[data-ed]').forEach(function(el){
        var o=el.getAttribute('data-orig'); if(!o||!edits.has(o)) return;
        var want=edits.get(o);
        if((el.innerText||'').trim()!==want){ el.innerText=want; el.setAttribute('data-dirty','1'); }
      });
      var n=document.getElementById('edn'); if(n) n.textContent=edits.size;
    } finally {
      if(mo) mo.observe(document.body,{childList:true,subtree:true});
      busy=false;
    }
  }
  mark(); restore();
  mo=new MutationObserver(function(){ if(busy) return; mark(); restore(); });
  mo.observe(document.body,{childList:true,subtree:true});
  /* 그려주는 쪽이 늦게 덮어쓰는 경우도 있어 가끔 확인한다. */
  setInterval(restore, 2500);

  function say(t){var m=document.getElementById('edmsg');m.textContent=t;m.style.display='block';
    clearTimeout(say._t); say._t=setTimeout(function(){m.style.display='none';},9000);}

  document.getElementById('edundo').onclick=function(){ if(edits.size&&!confirm('고친 것을 전부 되돌릴까요?'))return; clearKeep(); edits.clear(); location.reload(); };
  document.getElementById('edsave').onclick=function(){
    if(!edits.size){say('고친 곳이 없습니다.');return;}
    var list=[]; edits.forEach(function(v,k){list.push({original:k,updated:v});});
    fetch('/__save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(list)})
      .then(function(r){return r.json()}).then(function(j){
        var t='저장했습니다 — '+j.done.length+'곳';
        if(j.failed.length){ t+='\\n\\n못 고친 '+j.failed.length+'곳 (이건 말씀해주시면 손으로 고쳐드립니다)\\n'
          + j.failed.map(function(f){return '· "'+f.from.slice(0,40)+'" — '+f.why}).join('\\n'); }
        say(t);
        if(j.done.length){
          /* ⚠️ 반영 **실패한 것만 남기고** 지운다.
             전에는 전부 지우고 새로고침해서, 실패한 수정까지 화면에서 사라졌다
             (2026-08-20 "저장했는데도 날아갔다" 사고의 원인). */
          edits.clear();
          (j.failed||[]).forEach(function(f){ if(f.from) edits.set(f.from, f.to); });
          keep(); if(!edits.size) clearKeep();
          setTimeout(function(){location.reload()},2500);
        }
      }).catch(function(e){say('저장 실패: '+e.message)});
  };
})();
</script>
`;

/* ── 도구 서버: 홈페이지를 그대로 넘겨주되, HTML 이면 위 조각을 끼워 넣는다 ── */
const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/__save") {
    let body = ""; req.on("data", (c) => (body += c));
    req.on("end", () => {
      let out = { done: [], failed: [] };
      try { out = applyEdits(JSON.parse(body)); }
      catch (e) { out = { done: [], failed: [{ from: "", to: "", why: String(e.message) }] }; }
      console.log(`  저장: ${out.done.length}곳 반영${out.failed.length ? ` · 못 고침 ${out.failed.length}곳` : ""}`);
      out.failed.forEach((f) => {
        console.log(`    ⚠️ 못 고침 — ${f.why}`);
        console.log(`       전: ${f.from.split("\n").join(" / ")}`);
        console.log(`       후: ${f.to.split("\n").join(" / ")}`);
      });
      if (out.backup) console.log(`    (고치신 내용은 ${out.backup} 에 그대로 남겨뒀습니다)`);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(out));
    });
    return;
  }
  try {
    const upstream = await fetch(`http://127.0.0.1:${APP_PORT}${req.url}`, {
      method: req.method, headers: { ...req.headers, host: `127.0.0.1:${APP_PORT}` },
    });
    const type = upstream.headers.get("content-type") || "";
    if (type.includes("text/html")) {
      let html = await upstream.text();
      html = html.includes("</body>") ? html.replace("</body>", INJECT + "</body>") : html + INJECT;
      res.writeHead(upstream.status, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    } else {
      const buf = Buffer.from(await upstream.arrayBuffer());
      const h = {};
      upstream.headers.forEach((v, k) => { if (!/^(content-encoding|content-length|transfer-encoding)$/i.test(k)) h[k] = v; });
      res.writeHead(upstream.status, h);
      res.end(buf);
    }
  } catch (e) {
    res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("홈페이지가 아직 안 떴습니다. 잠시 뒤 새로고침 해주세요.\n" + e.message);
  }
});

/* ── 실시간 연결(WebSocket)도 그대로 넘긴다 ──
   이걸 안 하면 브라우저가 연결 실패로 판단해 화면을 계속 다시 불러오고,
   그때마다 화면에서 고치던 내용이 사라진다(2026-08-20 실제로 그랬다). */
server.on("upgrade", (req, socket, head) => {
  const net = require("node:net");
  const up = net.connect(APP_PORT, "127.0.0.1", () => {
    up.write(`${req.method} ${req.url} HTTP/1.1\r\n` +
      Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join("\r\n") + "\r\n\r\n");
    if (head && head.length) up.write(head);
    up.pipe(socket); socket.pipe(up);
  });
  up.on("error", () => socket.destroy());
  socket.on("error", () => up.destroy());
});

const url = `http://127.0.0.1:${EDIT_PORT}${PAGE}`;
if (!(await ready())) { console.error("홈페이지를 띄우지 못했습니다."); dev.kill(); process.exit(1); }
server.listen(EDIT_PORT, () => {
  console.log(`\n  준비됐습니다 →  ${url}\n`);
  console.log("  · 글자를 클릭해서 바로 고치세요 (파란 점선이 고칠 수 있는 자리입니다)");
  console.log("  · 고친 곳은 주황색으로 표시됩니다");
  console.log("  · 아래 [저장]을 누르면 실제 소스에 적힙니다");
  console.log("  · 라이브 사이트는 안 바뀝니다. 다 하시면 \"배포해\" 라고 말씀해주세요");
  console.log("  · 화면이 저절로 새로고침돼도 고치신 내용은 그대로 살아납니다");
  console.log("  · 끄기: 이 창에서 Ctrl+C\n");
  spawn("cmd", ["/c", "start", "", "chrome", url], { shell: false, stdio: "ignore" }).unref();
});

const bye = () => { try { dev.kill(); } catch { /* 이미 꺼짐 */ } process.exit(0); };
process.on("SIGINT", bye); process.on("SIGTERM", bye);
