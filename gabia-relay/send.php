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
    http_response_code(500);
    exit(json_encode(['code' => 'not_configured',
        'message' => 'send.php 위쪽 설정 4줄을 아직 안 채웠습니다.'], JSON_UNESCAPED_UNICODE));
}

// GET 으로 열면 "살아있다"만 알려준다. 열쇠도 번호도 보여주지 않는다.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    exit(json_encode(['code' => 'ready',
        'message' => '중계소가 살아 있습니다. 문자 발송은 POST 로만 받습니다.'], JSON_UNESCAPED_UNICODE));
}

$raw = file_get_contents('php://input');
$in  = json_decode($raw, true);
if (!is_array($in)) {
    http_response_code(400);
    exit(json_encode(['code' => 'bad_request', 'message' => '잘못된 요청입니다.'], JSON_UNESCAPED_UNICODE));
}

// 열쇠 확인. hash_equals 를 쓰는 이유 — 한 글자씩 비교하면 걸린 시간으로 열쇠를 알아낼 수 있다.
if (!isset($in['key']) || !hash_equals(RELAY_KEY, (string)$in['key'])) {
    http_response_code(401);
    exit(json_encode(['code' => 'unauthorized', 'message' => '열쇠가 맞지 않습니다.'], JSON_UNESCAPED_UNICODE));
}

$kind = isset($in['kind']) ? $in['kind'] : '';
$paths = [
    'sms'      => '/api/send/sms',
    'lms'      => '/api/send/lms',
    'alimtalk' => '/api/send/alimtalk',
];
if (!isset($paths[$kind])) {
    http_response_code(400);
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
    http_response_code(502);
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
if ($kind !== 'alimtalk') $fields['callback'] = SENDER;

$res = gabia_post('https://sms.gabia.com' . $paths[$kind],
    base64_encode(SMS_ID . ':' . $tok['access_token']), $fields);

if (!isset($res['code']) || (string)$res['code'] !== '200') http_response_code(502);
exit(json_encode($res, JSON_UNESCAPED_UNICODE));
