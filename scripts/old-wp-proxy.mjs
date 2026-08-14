// 옛 워드프레스 관리자 보기용 임시 다리 (로컬 프록시)
//
//   node scripts/old-wp-proxy.mjs        →  http://127.0.0.1:8899/login/ 을 브라우저로 열면 된다
//   (Ctrl+C 로 끄면 흔적 없이 끝. 옛 서버·이 PC 설정 아무것도 안 바꾼다)
//
// [왜 필요한가]
//   옛 워드프레스는 자기 주소를 아직 fantastrick.co.kr 로 알고 있다. 그래서
//   로그인만 해도 fantastrick.co.kr 로 보내버리는데, 그 주소는 이제 **새 홈페이지**다.
//   → 로그인하자마자 새 사이트로 튕겨 나가 관리자 화면을 볼 수가 없다.
//
// [무엇을 하나]
//   이 작은 서버가 가운데 서서
//     ① 요청을 옛 서버(211.47.74.37)로 넘기되 이름표(Host)를 fantastrick.co.kr 로 달아주고
//     ② 돌아온 답 안의 fantastrick.co.kr 을 전부 127.0.0.1:8899 로 바꿔준다.
//   워드프레스는 자기가 원래 주소에서 도는 줄 알고, 우리는 로컬에서 정상적으로 쓴다.
//
// ⚠️ 옛 사이트 자료를 보는 용도다. 여기서 글을 고치면 **진짜 옛 서버가 바뀐다.**

import http from "node:http";

const PORT = 8899;
const OLD_IP = "211.47.74.37";
const OLD_HOST = "fantastrick.co.kr";
const SELF = `http://127.0.0.1:${PORT}`;

/** 답 안에 박힌 옛 주소를 이 다리 주소로 바꾼다 (//호스트 형태·전체 주소 모두) */
function swap(text) {
  return text
    .replaceAll(`https://${OLD_HOST}`, SELF)
    .replaceAll(`http://${OLD_HOST}`, SELF)
    .replaceAll(`https:\\/\\/${OLD_HOST}`, SELF.replace(/\//g, "\\/")) // JSON 안에 이스케이프된 형태
    .replaceAll(`http:\\/\\/${OLD_HOST}`, SELF.replace(/\//g, "\\/"))
    .replaceAll(`//${OLD_HOST}`, `//127.0.0.1:${PORT}`);
}

const TEXTUAL = /text\/|json|javascript|xml/i;

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const body = Buffer.concat(chunks);
    const headers = { ...req.headers };
    headers.host = OLD_HOST;
    // 압축을 받지 않는다 — 글자를 바꿔치기해야 하므로 그대로 받는 편이 간단하고 안전하다.
    headers["accept-encoding"] = "identity";
    delete headers["if-none-match"];
    delete headers["if-modified-since"];

    const up = http.request({ host: OLD_IP, port: 80, path: req.url, method: req.method, headers }, (r) => {
      const out = { ...r.headers };

      // 이동 지시(Location) 안의 옛 주소도 바꿔줘야 로그인 후 튕기지 않는다.
      if (out.location) out.location = swap(out.location);

      // 쿠키: 도메인이 fantastrick.co.kr 로 박혀 있으면 로컬에서 저장이 안 된다 → 도메인 지정을 뗀다.
      //       https 전용(Secure) 표시도 뗀다 — 이 다리는 http 다.
      if (out["set-cookie"]) {
        out["set-cookie"] = out["set-cookie"].map((c) =>
          c.replace(/;\s*Domain=[^;]*/gi, "").replace(/;\s*Secure/gi, ""),
        );
      }
      delete out["content-security-policy"];
      delete out["strict-transport-security"];

      const type = String(r.headers["content-type"] || "");
      if (!TEXTUAL.test(type)) {
        res.writeHead(r.statusCode || 200, out);
        r.pipe(res);
        return;
      }

      const buf = [];
      r.on("data", (c) => buf.push(c));
      r.on("end", () => {
        const text = swap(Buffer.concat(buf).toString("utf8"));
        const b = Buffer.from(text, "utf8");
        out["content-length"] = String(b.length); // 글자를 바꿨으니 길이도 다시 알려줘야 한다
        res.writeHead(r.statusCode || 200, out);
        res.end(b);
      });
    });

    up.on("error", (e) => { res.writeHead(502); res.end("옛 서버에 연결하지 못했습니다: " + e.message); });
    if (body.length) up.write(body);
    up.end();
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`옛 워드프레스 다리가 열렸습니다 → ${SELF}/login/`);
  console.log("끄려면 이 창에서 Ctrl+C");
});
