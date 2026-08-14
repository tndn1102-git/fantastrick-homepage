// 옛 워드프레스 서버 .htaccess 에 /login 예외 한 줄 추가 (1회용)
//   node scripts/old-htaccess-add-login.mjs
// 백업(backups/htaccess-old-backup.txt)을 읽어 고친 새 파일을 backups/htaccess-new.txt 로 만든다.
// 업로드는 따로 한다 — 만들어진 파일을 눈으로 확인한 뒤 올리기 위해서.

import fs from "node:fs";

const SRC = "backups/htaccess-old-backup.txt";
const OUT = "backups/htaccess-new.txt";

let s = fs.readFileSync(SRC, "utf8");
const nl = s.includes("\r\n") ? "\r\n" : "\n";

if (s.includes("!^/login")) {
  console.log("이미 /login 예외가 있습니다. 그대로 둡니다.");
  process.exit(0);
}

const lines = s.split(/\r?\n/);

// ① 예외 목록에 한 줄 추가 — wp-login.php 줄 바로 뒤
const i = lines.findIndex((l) => l.includes("REQUEST_URI") && l.includes("wp-login"));
if (i < 0) { console.error("✗ wp-login 조건 줄을 못 찾았습니다. 파일 구조가 바뀌었는지 확인하세요."); process.exit(1); }
lines.splice(i + 1,
  0,
  "# /login — 이 워드프레스는 보안 플러그인이 로그인 주소를 wp-login.php 에서 /login/ 으로 바꿔놨다.",
  "#          이게 빠져 있으면 wp-admin 을 열어도 로그인 화면에서 새 사이트로 튕긴다.",
  "#          (2026-08-14 사장님이 옛 관리자 화면을 보려고 추가)",
  "RewriteCond %{REQUEST_URI} !^/login",
);

// ② 위쪽 설명(예외로 열어두는 것)에도 한 줄 적어둔다 — 나중에 이 파일만 봐도 이유를 알게
const j = lines.findIndex((l) => l.includes("/wp-admin") && l.includes("옛 워드프레스 관리자"));
if (j >= 0) lines.splice(j + 1, 0, "#   /login       — 그 관리자의 실제 로그인 화면(보안 플러그인이 주소를 바꿔둠).");

fs.writeFileSync(OUT, lines.join(nl), "utf8");
console.log(`✔ ${OUT} 생성 (${lines.length}줄)`);
console.log("\n추가된 줄:");
lines.filter((l) => l.includes("!^/login") || l.includes("/login       —")).forEach((l) => console.log("  " + l));
