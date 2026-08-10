<?php
/* ─────────────────────────────────────────────────────────────────────────
   판타스트릭 — 가비아 문자 중계소 (send.php)

   [이게 뭐예요?]
     우리 새 홈페이지(Cloudflare)는 나가는 주소(IP)가 매번 바뀝니다.
     그런데 가비아 문자 API 는 "발송 서버 IP" 를 미리 등록해야 받아줍니다.
     그래서 **주소가 고정된 이 서버**에 파일 하나를 두고, 홈페이지는 이 파일만 부릅니다.
     실제로 가비아에 문자를 넣는 건 이 파일이고, 이 서버의 주소는 안 바뀝니다.

         홈페이지(Cloudflare)  ──▶  이 파일(가비아 서버)  ──▶  가비아 문자

   [어디에 올려요?]
     주소가 고정된 서버면 어디든 됩니다. 지금 fantastrick.co.kr 이 올라가 있는
     가비아 웹호스팅이 제일 쉽습니다 — **그 주소는 이미 가비아 문자에 등록돼 있어서**
     따로 등록할 것도 없습니다.
     홈페이지 내용은 다 지워도 됩니다. 이 파일 하나만 살아 있으면 됩니다.

   [올린 뒤 할 일]
     ① 아래 설정 4줄을 채웁니다.
     ② 브라우저로 이 파일 주소를 열어봅니다 → {"code":"ready", ...} 가 보이면 정상.
     ③ 그 주소와 RELAY_KEY 를 알려주시면 홈페이지에 연결합니다.

   [안전장치]
     · RELAY_KEY 가 맞아야만 받아줍니다. 주소를 알아도 열쇠가 없으면 못 씁니다.
     · 받는 번호·내용은 홈페이지가 정합니다. 이 파일은 그대로 넘기기만 합니다.
     · 이 파일은 **읽기 전용 창구**가 아니라 문자를 보내는 창구입니다.
       주소를 아무 데나 적어두지 마세요.
   ───────────────────────────────────────────────────────────────────────── */

/* ── 설정 — 이 4줄만 채우면 됩니다 ───────────────────────────────────── */

// 1) 가비아 문자 서비스 ID (관리툴 로그인 ID)
define('SMS_ID', 'PUT_YOUR_SMS_ID');

// 2) 가비아 API 인증키
//    관리툴(sms.gabia.com) › 관리자 › 서비스 정보 › 관리 중인 서비스 › API 인증키 정보
define('API_KEY', 'PUT_YOUR_API_KEY');

// 3) 발신번호 (숫자만, 하이픈 없이). 관리툴 › 환경 설정 › 발신 번호 에 등록된 번호여야 합니다.
define('SENDER', '0000000000');

// 4) 홈페이지와 나눠 가질 비밀번호. 아무 문자열이나 길게(20자 이상) 만들어 주세요.
//    같은 값을 홈페이지 쪽에도 넣습니다.
define('RELAY_KEY', 'PUT_A_LONG_RANDOM_SECRET');

/* ── 여기부터는 고치지 않아도 됩니다 ────────────────────────────────── */

header('Content-Type: application/json; charset=utf-8');

// 설정을 안 채웠으면 먼저 알려준다 — 엉뚱한 오류를 쫓는 시간을 없앤다.
if (SMS_ID === 'PUT_YOUR_SMS_ID' || API_KEY === 'PUT_YOUR_API_KEY' || RELAY_KEY === 'PUT_A_LONG_RANDOM_SECRET') {
    exit(json_encode(['code' => 'not_configured',
        'message' => 'send.php 위쪽 설정 4줄을 아직 안 채웠습니다.'], JSON_UNESCAPED_UNICODE));
}

/* GET 으로 열면 자가진단을 한다 — **문자는 안 나간다.**
   가비아에 토큰을 한 번 받아보고, 막히면 그 오류를 그대로 보여준다.
   가비아는 막을 때 "(현재 IP : x.x.x.x)" 로 **부른 쪽 주소를 알려준다.**
   그래서 이 화면 한 번이면 "관리툴에 등록할 주소"가 바로 나온다 — 따로 찾을 필요가 없다. */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $t = gabia_post('https://sms.gabia.com/oauth/token',
        base64_encode(SMS_ID . ':' . API_KEY), ['grant_type' => 'client_credentials']);

    if (!empty($t['access_token'])) {
        exit(json_encode(['code' => 'ready',
            'message' => '준비 끝. 이 서버 주소가 관리툴에 등록돼 있고 가비아가 받아줍니다.',
            'php'     => PHP_VERSION,
            // 잠금(AES-256-GCM)을 이 서버가 지원하는지. false 면 홈페이지가 보낸 걸 못 연다.
            'gcm'     => in_array('aes-256-gcm', openssl_get_cipher_methods(), true),
        ], JSON_UNESCAPED_UNICODE));
    }

    $msg = isset($t['message']) ? $t['message'] : '토큰 발급 실패';
    $ip  = null;
    // "(현재 IP : 1.2.3.4)" 에서 주소만 뽑아낸다.
    if (preg_match('/(\d{1,3}(?:\.\d{1,3}){3})/', $msg, $m)) $ip = $m[1];

    exit(json_encode([
        'code'    => 'ip_not_registered',
        'message' => $msg,
        'register_this_ip' => $ip,
        'how'     => $ip
            ? "관리툴(sms.gabia.com) › 관리자 › 기본 설정 › 이용 중인 설정 항목 › API 발송 IP설정 에 [{$ip}] 를 넣고 저장한 뒤, 이 페이지를 새로고침하세요."
            : '관리툴 › 관리자 › 기본 설정 › API 발송 IP설정 을 확인하세요.',
    ], JSON_UNESCAPED_UNICODE));
}

/* ─── 요청 열기 ───────────────────────────────────────────────────────
   ⚠️ fantastrick.co.kr 에는 SSL 인증서가 없다(https 로 열면 가비아 403 으로 튕긴다).
      그래서 홈페이지 → 이 파일 구간은 **평문 http** 다. 그냥 보내면 손님 전화번호와
      문자 내용, 열쇠까지 인터넷에 그대로 흘러간다.
      → 그래서 **내용물 자체를 잠가서** 보낸다(AES-256-GCM). 길이 아니라 짐을 잠근 셈이다.
        · 열쇠는 오가지 않는다 — 양쪽이 같은 열쇠로 풀 수 있느냐로 신원을 대신한다.
        · GCM 이라 내용이 한 글자라도 바뀌면 복호화 자체가 실패한다(위조 차단).
        · 안에 보낸 시각을 넣어 5분이 지난 요청은 버린다(같은 요청 재사용 차단).
      나중에 이 도메인에 SSL 이 붙으면 이 잠금은 그대로 두어도 무해하다(이중으로 안전). */
$raw = file_get_contents('php://input');
$env = json_decode($raw, true);

if (!is_array($env) || empty($env['d'])) {
    exit(json_encode(['code' => 'bad_request', 'message' => '잘못된 요청입니다.'], JSON_UNESCAPED_UNICODE));
}
if (!in_array('aes-256-gcm', openssl_get_cipher_methods(), true)) {
    exit(json_encode(['code' => 'no_gcm',
        'message' => '이 서버의 PHP 가 aes-256-gcm 을 지원하지 않습니다. (PHP ' . PHP_VERSION . ')'], JSON_UNESCAPED_UNICODE));
}

$blob = base64_decode((string)$env['d'], true);
// [앞 12바이트 = IV][가운데 = 잠긴 내용][뒤 16바이트 = 확인표]
if ($blob === false || strlen($blob) < 12 + 16 + 2) {
    exit(json_encode(['code' => 'bad_request', 'message' => '잘못된 요청입니다.'], JSON_UNESCAPED_UNICODE));
}
$iv     = substr($blob, 0, 12);
$tag    = substr($blob, -16);
$cipher = substr($blob, 12, strlen($blob) - 28);

// 열쇠 문자열을 그대로 쓰지 않고 SHA-256 으로 32바이트를 만든다(양쪽 규칙이 같아야 한다).
$plain = openssl_decrypt($cipher, 'aes-256-gcm', hash('sha256', RELAY_KEY, true),
    OPENSSL_RAW_DATA, $iv, $tag);

if ($plain === false) {
    exit(json_encode(['code' => 'unauthorized', 'message' => '열 수 없는 요청입니다.'], JSON_UNESCAPED_UNICODE));
}
$in = json_decode($plain, true);
if (!is_array($in)) {
    exit(json_encode(['code' => 'bad_request', 'message' => '잘못된 요청입니다.'], JSON_UNESCAPED_UNICODE));
}

// 오래된 요청 거절 — 누가 통째로 복사해 두었다가 나중에 다시 던져도 안 먹게.
$ts = isset($in['ts']) ? (int)$in['ts'] : 0;
if (abs(time() - $ts) > 300) {
    exit(json_encode(['code' => 'stale', 'message' => '요청 시각이 너무 차이납니다.'], JSON_UNESCAPED_UNICODE));
}

$kind = isset($in['kind']) ? $in['kind'] : '';
$paths = [
    'sms'      => '/api/send/sms',
    'lms'      => '/api/send/lms',
    'alimtalk' => '/api/send/alimtalk',
    // 조회 전용 — 계정에 무엇이 붙어 있고 잔액이 얼마인지 본다. **발송이 아니라 차감이 없다.**
    'info'     => '/api/user/info',
];
if (!isset($paths[$kind])) {
    exit(json_encode(['code' => 'bad_kind', 'message' => '보낼 종류가 잘못됐습니다.'], JSON_UNESCAPED_UNICODE));
}

/** 가비아에 POST 한 번. */
function gabia_post($url, $auth, $fields) {
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => is_array($fields) ? http_build_query($fields) : $fields,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/x-www-form-urlencoded',
            'Authorization: Basic ' . $auth,
        ],
    ]);
    $body = curl_exec($ch);
    $err  = curl_error($ch);
    curl_close($ch);
    if ($body === false) return ['code' => 'curl_error', 'message' => $err];
    $j = json_decode($body, true);
    return is_array($j) ? $j : ['code' => 'parse_error', 'message' => substr((string)$body, 0, 200)];
}

// ① 토큰 발급 (인증 단계에서만 API_KEY 를 쓴다)
$tok = gabia_post('https://sms.gabia.com/oauth/token',
    base64_encode(SMS_ID . ':' . API_KEY), ['grant_type' => 'client_credentials']);

if (empty($tok['access_token'])) {
    exit(json_encode(['code' => 'token_error',
        'message' => isset($tok['message']) ? $tok['message'] : '토큰 발급 실패'], JSON_UNESCAPED_UNICODE));
}

// ② 실제 발송 (발송 단계는 ACCESS_TOKEN 으로 바뀐다)
//    홈페이지가 보낸 값 중 **정해진 칸만** 통과시킨다. 모르는 칸은 버린다.
$allow  = ['phone', 'message', 'subject', 'refkey', 'template_id', 'template_variable', 'request_time'];
$fields = [];
foreach ($allow as $k) {
    if (isset($in[$k]) && $in[$k] !== '') $fields[$k] = (string)$in[$k];
}
// 발신번호는 홈페이지가 아니라 **여기서** 넣는다. 밖에서 바꿔 끼울 수 없게.
if ($kind !== 'alimtalk' && $kind !== 'info') $fields['callback'] = SENDER;

// 잔액 조회만 GET 이다(발송은 전부 POST).
if ($kind === 'info') {
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => 'https://sms.gabia.com/api/user/info',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_HTTPHEADER     => ['Authorization: Basic ' . base64_encode(SMS_ID . ':' . $tok['access_token'])],
    ]);
    $b = curl_exec($ch); curl_close($ch);
    $j = json_decode($b, true);
    exit(json_encode(is_array($j) ? $j : ['code' => 'parse_error', 'message' => substr((string)$b, 0, 300)],
        JSON_UNESCAPED_UNICODE));
}

$res = gabia_post('https://sms.gabia.com' . $paths[$kind],
    base64_encode(SMS_ID . ':' . $tok['access_token']), $fields);

/* ⚠️ 실패라고 HTTP 상태를 500·502 로 주면 **가비아 웹서버가 본문을 자기 오류 페이지로 갈아치운다.**
      그러면 "왜 안 갔는지"가 사라진다. 그래서 항상 200 으로 답하고,
      성공·실패는 본문의 code 로만 구분한다(가비아 성공 = code "200"). 홈페이지도 그렇게 읽는다. */
exit(json_encode($res, JSON_UNESCAPED_UNICODE));
