/* 🖊 비즈니스 페이지 문구를 **화면에서 바로 고치는 도구** (내 컴퓨터 전용)
 * ─────────────────────────────────────────────────────────────────────────
 *   node scripts/edit-business.mjs
 *
 * 하는 일
 *   ① 이 컴퓨터에서 홈페이지를 띄운다(고치면 바로 화면에 반영되는 개발 모드)
 *   ② 그 화면을 한 겹 감싸 **글자를 클릭하면 고칠 수 있게** 만든다
 *   ③ [저장]을 누르면 실제 소스(src/app/business/page.tsx)에 그대로 적어 넣는다
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

const APP_PORT = 3459;   // 홈페이지(개발 모드)
const EDIT_PORT = 3460;  // 고치기 도구
const TARGET = "src/app/business/page.tsx";
const PAGE = "/business";

if (!fs.existsSync(TARGET)) { console.error(`${TARGET} 을 찾을 수 없습니다. 프로젝트 폴더에서 실행하세요.`); process.exit(1); }

/* ── ① 홈페이지 띄우기 ── */
console.log("홈페이지를 띄우는 중입니다… (처음엔 30초쯤 걸립니다)");
const dev = spawn("npx", ["next", "dev", "-p", String(APP_PORT)], { shell: true, stdio: ["ignore", "pipe", "pipe"] });
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
  let src = fs.readFileSync(TARGET, "utf8");
  const done = [], failed = [];
  for (const { original, updated } of edits) {
    const from = String(original ?? "").trim();
    const to = String(updated ?? "").trim();
    if (!from || from === to) continue;

    // 1차: 글자 그대로 찾기
    let count = src.split(from).length - 1;
    if (count === 1) { src = src.replace(from, to); done.push({ from, to }); continue; }

    // 2차: 줄바꿈·공백이 다를 수 있으니 공백을 느슨하게 맞춰 찾기
    const loose = new RegExp(from.split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+"), "g");
    const hits = src.match(loose) || [];
    if (hits.length === 1) { src = src.replace(loose, to); done.push({ from, to }); continue; }

    failed.push({ from, to, why: hits.length === 0 && count === 0 ? "소스에서 못 찾음(코드로 만들어지는 글자일 수 있음)" : `같은 문장이 ${Math.max(count, hits.length)}곳에 있음` });
  }
  if (done.length) fs.writeFileSync(TARGET, src, "utf8");
  return { done, failed };
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
  var SKIP={SCRIPT:1,STYLE:1,SVG:1,PATH:1,INPUT:1,TEXTAREA:1,SELECT:1,OPTION:1};
  function leafy(el){
    if(SKIP[el.tagName]) return false;
    if(el.closest('#edbar,#edmsg')) return false;
    var t=(el.textContent||'').trim();
    if(!t||!KO.test(t)||t.length>300) return false;
    // 자식으로 다른 덩어리를 품고 있으면 그건 바깥 상자다 — 가장 안쪽만 고른다
    for(var i=0;i<el.children.length;i++){ var c=el.children[i];
      if(!/^(BR|B|I|EM|STRONG|SPAN|SMALL|U|SUP|SUB)$/.test(c.tagName)) return false; }
    return true;
  }
  function mark(){
    document.querySelectorAll('body *').forEach(function(el){
      if(el.hasAttribute('data-ed')) return;
      if(!leafy(el)) return;
      el.setAttribute('data-ed','1');
      el.setAttribute('data-orig',(el.innerText||'').trim());
      el.setAttribute('contenteditable','plaintext-only');
      el.addEventListener('input',function(){
        var o=el.getAttribute('data-orig'), n=(el.innerText||'').trim();
        if(n===o){edits.delete(o);el.setAttribute('data-dirty','0');}
        else{edits.set(o,n);el.setAttribute('data-dirty','1');}
        document.getElementById('edn').textContent=edits.size;
      });
      // 링크는 클릭하면 이동해버린다 — 고치는 동안 막는다
      el.addEventListener('click',function(e){ if(el.closest('a')) e.preventDefault(); });
    });
  }
  mark(); new MutationObserver(mark).observe(document.body,{childList:true,subtree:true});

  function say(t){var m=document.getElementById('edmsg');m.textContent=t;m.style.display='block';
    clearTimeout(say._t); say._t=setTimeout(function(){m.style.display='none';},9000);}

  document.getElementById('edundo').onclick=function(){ if(edits.size&&!confirm('고친 것을 전부 되돌릴까요?'))return; location.reload(); };
  document.getElementById('edsave').onclick=function(){
    if(!edits.size){say('고친 곳이 없습니다.');return;}
    var list=[]; edits.forEach(function(v,k){list.push({original:k,updated:v});});
    fetch('/__save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(list)})
      .then(function(r){return r.json()}).then(function(j){
        var t='저장했습니다 — '+j.done.length+'곳';
        if(j.failed.length){ t+='\\n\\n못 고친 '+j.failed.length+'곳 (이건 말씀해주시면 손으로 고쳐드립니다)\\n'
          + j.failed.map(function(f){return '· "'+f.from.slice(0,40)+'" — '+f.why}).join('\\n'); }
        say(t);
        if(j.done.length) setTimeout(function(){location.reload()},2500);
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
      out.failed.forEach((f) => console.log(`    ⚠️ "${f.from.slice(0, 50)}" — ${f.why}`));
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

const url = `http://127.0.0.1:${EDIT_PORT}${PAGE}`;
if (!(await ready())) { console.error("홈페이지를 띄우지 못했습니다."); dev.kill(); process.exit(1); }
server.listen(EDIT_PORT, () => {
  console.log(`\n  준비됐습니다 →  ${url}\n`);
  console.log("  · 글자를 클릭해서 바로 고치세요 (파란 점선이 고칠 수 있는 자리입니다)");
  console.log("  · 고친 곳은 주황색으로 표시됩니다");
  console.log("  · 아래 [저장]을 누르면 실제 소스에 적힙니다");
  console.log("  · 라이브 사이트는 안 바뀝니다. 다 하시면 \"배포해\" 라고 말씀해주세요");
  console.log("  · 끄기: 이 창에서 Ctrl+C\n");
  spawn("cmd", ["/c", "start", "", "chrome", url], { shell: false, stdio: "ignore" }).unref();
});

const bye = () => { try { dev.kill(); } catch { /* 이미 꺼짐 */ } process.exit(0); };
process.on("SIGINT", bye); process.on("SIGTERM", bye);
