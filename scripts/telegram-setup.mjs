// 텔레그램 알림 연결 도우미
//
//   node scripts/telegram-setup.mjs <봇토큰>
//
// 하는 일: 봇에게 온 메시지에서 "대화방 번호(chat_id)"를 찾아내고, 시험 메시지를 한 통 보낸 뒤,
//          .env.local 에 붙여넣을 두 줄을 그대로 만들어 준다.
//
// ⚠️ 먼저 텔레그램 앱에서 **봇에게 아무 말이나 한 번 보내야** 한다.
//    봇은 자기에게 말을 건 적 없는 사람에게는 먼저 말을 걸 수 없다(스팸 방지).

const token = process.argv[2];
if (!token) {
  console.error("사용법: node scripts/telegram-setup.mjs <봇토큰>");
  process.exit(1);
}

const api = async (m, q = "") => (await fetch(`https://api.telegram.org/bot${token}/${m}${q}`)).json();

// 1) 봇이 살아있는지
const me = await api("getMe");
if (!me.ok) {
  console.error("✗ 봇 토큰이 올바르지 않습니다:", me.description || "알 수 없는 오류");
  process.exit(1);
}
console.log(`✔ 봇 확인: @${me.result.username} (${me.result.first_name})`);

// 2) 나에게 말 건 사람의 대화방 번호 찾기
const up = await api("getUpdates");
const chats = new Map();
for (const u of up.result || []) {
  const c = u.message?.chat || u.channel_post?.chat;
  if (c) chats.set(String(c.id), c);
}

if (chats.size === 0) {
  console.error("\n✗ 아직 봇에게 온 메시지가 없습니다.");
  console.error(`  텔레그램에서 @${me.result.username} 를 찾아 아무 말이나 한 번 보낸 뒤 다시 실행해 주세요.`);
  process.exit(1);
}

const [id, chat] = [...chats.entries()][chats.size - 1]; // 가장 마지막에 말 건 사람
console.log(`✔ 대화방 찾음: ${chat.first_name || chat.title || ""} (chat_id ${id})`);

// 3) 시험 발송
const send = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chat_id: id,
    text: "[판타스트릭] 텔레그램 알림이 연결됐습니다.\n앞으로 1:1 문의가 들어오면 여기로 옵니다. (무료)",
  }),
}).then((r) => r.json());

console.log(send.ok ? "✔ 시험 메시지 보냄 — 폰을 확인해 주세요." : `✗ 발송 실패: ${send.description}`);

console.log("\n─── .env.local 에 붙여넣을 두 줄 ───");
console.log(`TELEGRAM_BOT_TOKEN=${token}`);
console.log(`TELEGRAM_CHAT_ID=${id}`);
