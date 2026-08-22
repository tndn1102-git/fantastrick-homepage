/* ─── 가비아 문자·알림톡 발송 (NHN 대신 쓰는 길) ─────────────────────────
 *
 * [왜 이 파일이 있나 — 2026-08-09]
 *   원래는 NHN Cloud 로 보낸다(sms.ts). 그런데 NHN 은 본인인증이 막혀 알림톡을 켤 수 없다.
 *   가비아 문자는 **기존 사이트에서 이미 쓰던 것**이라 계정·발신번호·잔액이 그대로 살아 있다.
 *   그래서 알림톡이 필요한 동안은 가비아로 보낸다.
 *
 * [⚠️ 가비아의 함정 — 발송 IP 등록]
 *   가비아 API 는 관리툴에 **"발송 서버 IP"를 미리 등록**해야 한다(공식 문서 1번 항목).
 *   그런데 Cloudflare Workers 는 나가는 IP 가 매번 바뀐다 — 알리고에서 "인증오류-IP" 를
 *   맞았던 그 문제와 같다. 그래서 길이 두 갈래다:
 *
 *     ① 직접 호출  — IP 검사가 실제로는 느슨하면 이대로 된다. 먼저 시험해 본다.
 *                    (/api/admin/gabia-test 가 문자 한 통 안 보내고 이걸 확인한다)
 *     ② 중계 호출  — 막히면 **고정 IP 를 가진 서버에 중계 파일 하나**를 두고 그것만 부른다.
 *                    GABIA_RELAY_URL 이 있으면 자동으로 이 길로 간다.
 *                    중계 파일은 gabia-relay/send.php 에 준비돼 있다.
 *
 * [env]
 *   GABIA_SMS_ID      가비아 문자 서비스 ID
 *   GABIA_API_KEY     관리툴 › 관리자 › 서비스 정보 › API 인증키
 *   GABIA_SENDER      발신번호(숫자만, 관리툴에 등록된 번호여야 함)
 *   GABIA_TPL_CONFIRM 알림톡 템플릿 번호(관리툴 › 환경 설정 › 알림톡 템플릿)
 *   GABIA_TPL_CONFIRM_DUAT (선택) 〈사자의 서〉 전용 템플릿 번호.
 *                     기존 템플릿과 문구·변수 순서가 똑같고 **세계관 페이지 주소 한 줄만 더 있다.**
 *                     없으면 자동으로 공용 템플릿(GABIA_TPL_CONFIRM)으로 나간다 — 안전한 기본값.
 *   GABIA_RELAY_URL   (선택) 중계 파일 주소. 있으면 직접 호출 대신 여기로 보낸다.
 *   GABIA_RELAY_KEY   (선택) 중계 파일과 나눠 갖는 비밀번호. 아무나 못 부르게 막는 열쇠.
 */
import { normalizePhone } from "./util";

const HOST = "https://sms.gabia.com";

export type GabiaResult = { ok: boolean; error?: string };

export function gabiaConfigured(): boolean {
  return !!(process.env.GABIA_SMS_ID && process.env.GABIA_API_KEY && process.env.GABIA_SENDER);
}
export function gabiaAlimtalkConfigured(): boolean {
  return gabiaConfigured() && !!process.env.GABIA_TPL_CONFIRM;
}
function relayUrl(): string | undefined {
  return process.env.GABIA_RELAY_URL;
}

/* 토큰은 1시간(expires_in 3600)짜리다. 매번 새로 받으면 발송 한 통에 왕복이 두 번이라 느리다.
   ⚠️ 워커는 인스턴스가 수시로 갈리므로 이 캐시는 "있으면 이득" 정도로만 믿는다.
      만료 1분 전에 미리 버려서, 보내는 도중에 만료되는 일이 없게 한다. */
let cachedToken: { value: string; until: number } | null = null;

async function getToken(): Promise<{ token?: string; error?: string }> {
  if (cachedToken && Date.now() < cachedToken.until) return { token: cachedToken.value };

  const id = process.env.GABIA_SMS_ID;
  const key = process.env.GABIA_API_KEY;
  if (!id || !key) return { error: "가비아 열쇠 미설정" };

  try {
    const res = await fetch(`${HOST}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // 사용자 인증 단계에서만 API_KEY 를 쓴다. 발송 단계는 ACCESS_TOKEN 으로 바뀐다.
        Authorization: `Basic ${btoa(`${id}:${key}`)}`,
      },
      body: "grant_type=client_credentials",
    });
    const j = (await res.json().catch(() => ({}))) as {
      access_token?: string; expires_in?: number; message?: string;
    };
    if (!j.access_token) return { error: j.message || `HTTP ${res.status}` };
    cachedToken = { value: j.access_token, until: Date.now() + ((j.expires_in ?? 3600) - 60) * 1000 };
    return { token: j.access_token };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "가비아 토큰 요청 실패" };
  }
}

/** 발송·조회 공통 호출. 가비아는 폼(form) 형식으로 받는다(JSON 아님). */
async function call(path: string, form: Record<string, string>): Promise<{ code?: string; message?: string; data?: unknown }> {
  const { token, error } = await getToken();
  if (!token) return { code: "token_error", message: error };
  const id = process.env.GABIA_SMS_ID!;
  const res = await fetch(`${HOST}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${id}:${token}`)}`,
    },
    body: new URLSearchParams(form).toString(),
  });
  return (await res.json().catch(() => ({ code: "parse_error", message: `HTTP ${res.status}` }))) as {
    code?: string; message?: string; data?: unknown;
  };
}

/** 가비아는 성공일 때만 code "200" 을 준다(실패는 code 가 문자열 사유이거나 false). */
function ok(r: { code?: string; message?: string }): GabiaResult {
  if (String(r.code) === "200") return { ok: true };
  return { ok: false, error: `${r.code ?? ""} ${r.message ?? ""}`.trim().slice(0, 200) || "알 수 없는 오류" };
}

/* ─── 중계 경로 ─────────────────────────────────────────────────────────
   고정 IP 서버의 send.php 에 "무엇을 보낼지"만 넘기고, 가비아 호출은 그쪽이 한다.
   열쇠(GABIA_RELAY_KEY)가 맞아야 받아준다 — 주소가 새 나가도 아무나 못 쓴다. */
/* ⚠️ 중계소가 있는 fantastrick.co.kr 에는 SSL 인증서가 없다 — https 로 열면 가비아 403 으로 튕긴다.
      즉 이 구간은 **평문 http** 다. 손님 전화번호와 문자 내용이 그대로 흐르면 안 되므로
      **보낼 내용을 우리가 먼저 잠근다**(AES-256-GCM). 길이 아니라 짐을 잠그는 방식이다.
        · 열쇠 자체는 오가지 않는다 — 같은 열쇠로 풀리느냐가 곧 신원 확인이다.
        · 내용이 한 글자라도 바뀌면 상대가 못 연다(위조 차단).
        · 보낸 시각(ts)을 함께 넣어, 5분 지난 요청은 중계소가 버린다(재사용 차단).
      보내는 모양: { d: base64( [IV 12] + [잠긴내용] + [확인표 16] ) } */
async function seal(payload: unknown): Promise<string> {
  const secret = process.env.GABIA_RELAY_KEY ?? "";
  const raw = new TextEncoder().encode(JSON.stringify(payload));
  // 열쇠 문자열을 그대로 쓰지 않고 SHA-256 으로 32바이트를 만든다(PHP 쪽 규칙과 같아야 한다).
  const keyBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, raw));

  const out = new Uint8Array(iv.length + sealed.length);
  out.set(iv, 0);
  out.set(sealed, iv.length);
  let bin = "";
  for (const b of out) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function viaRelay(kind: string, form: Record<string, string>): Promise<GabiaResult> {
  const url = relayUrl();
  if (!url) return { ok: false, error: "중계 주소 미설정" };
  try {
    const d = await seal({ kind, ts: Math.floor(Date.now() / 1000), ...form });
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ d }),
    });
    const j = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
    return ok(j);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "중계 호출 실패" };
  }
}

/**
 * 문자 한 통. 90바이트를 넘으면 장문(LMS)으로 보낸다.
 * ⚠️ 가비아는 NHN 과 달리 경로가 sms/lms 로 갈리고, LMS 는 제목(subject)이 따로 있다.
 */
export async function gabiaSendSms(to: string, body: string, title: string): Promise<GabiaResult> {
  if (!gabiaConfigured()) return { ok: false, error: "가비아 열쇠 미설정" };
  let n = 0;
  for (const ch of body) n += ch.charCodeAt(0) < 128 ? 1 : 2;
  const long = n > 90;

  const form: Record<string, string> = {
    phone: normalizePhone(to),
    callback: normalizePhone(process.env.GABIA_SENDER!),
    message: body,
    // refkey 는 나중에 "이 문자 어떻게 됐나" 조회하는 표식이다. 겹치면 안 되므로 시각+번호로 만든다.
    refkey: `ft${Date.now()}${normalizePhone(to).slice(-4)}`,
  };
  if (long) form.subject = title;

  if (relayUrl()) return viaRelay(long ? "lms" : "sms", form);
  return ok(await call(long ? "/api/send/lms" : "/api/send/sms", form));
}

/**
 * 알림톡 한 통.
 *
 * ⚠️ **가비아 알림톡 API 에는 "문자 대체발송" 파라미터가 없다.**
 *    (BODY = phone / template_id / template_variable / request_time 이 전부다)
 *    카톡을 못 받는 사람에게 문자로 넘기는 것은 **관리툴 설정**으로 동작한다고 안내돼 있다
 *    — "알림톡과 SMS가 함께 설정된 경우 알림톡이 우선 발송되며, 실패 시에만 SMS 로 대체 발송".
 *    그래서 이 함수는 대체발송을 요청하지 않는다. 관리툴에서 켜는 것이 맞다.
 *    만약 관리툴 설정이 API 발송에는 적용되지 않는다면, 호출측(sendReservationSms)이
 *    실패를 보고 문자로 한 번 더 보낸다 — 어느 쪽이든 손님에게는 도착한다.
 *
 * @param vars 템플릿 변수. 가비아는 이름표가 아니라 **순서**로 넣는다(변수1|변수2|변수3).
 *             그래서 템플릿을 만들 때 정한 순서와 이 배열의 순서가 반드시 같아야 한다.
 */
/* 테마에 맞는 템플릿 번호를 고른다.
   〈사자의 서〉 예약자에게만 세계관 페이지 주소가 나가야 해서, 그 테마만 다른 템플릿을 쓴다.
   ⚠️ 알림톡 템플릿은 카카오 심사를 받은 **본문 그 자체**라, 코드에서 문장을 바꿔 넣을 수 없다.
      주소를 넣으려면 그 주소가 적힌 템플릿을 따로 등록하는 수밖에 없다.
   ⚠️ 두 템플릿의 **변수 순서(#{이름}→#{테마}→#{날짜}→#{시간})는 반드시 같게** 등록할 것.
      다르면 손님에게 "이름 자리에 날짜"가 찍혀 나간다. */
function pickTemplate(themeId?: string): string | undefined {
  if (themeId === "bookofduat" && process.env.GABIA_TPL_CONFIRM_DUAT) {
    return process.env.GABIA_TPL_CONFIRM_DUAT;
  }
  return process.env.GABIA_TPL_CONFIRM;
}

export async function gabiaSendAlimtalk(to: string, vars: string[], themeId?: string): Promise<GabiaResult> {
  const tpl = pickTemplate(themeId);
  if (!gabiaConfigured() || !tpl) return { ok: false, error: "가비아 알림톡 미설정" };

  const form: Record<string, string> = {
    phone: normalizePhone(to),
    template_id: tpl,
    // 변수 안에 | 가 들어가면 칸이 밀린다. 테마명·이름에 섞여 들어올 수 있으니 미리 없앤다.
    template_variable: vars.map((v) => v.replaceAll("|", " ")).join("|"),
  };

  if (relayUrl()) return viaRelay("alimtalk", form);
  return ok(await call("/api/send/alimtalk", form));
}

/**
 * 연결 시험 — **문자를 보내지 않고** 열쇠와 IP 만 확인한다.
 *
 * 이게 이 파일에서 제일 중요한 함수다. 가비아의 IP 검사가 우리를 막는지 아닌지를
 * **돈 한 푼 안 쓰고, 손님에게 문자 한 통 안 보내고** 알아내는 유일한 방법이다.
 *   · 토큰까지 나오고 잔여건수가 보이면 → 직접 호출 가능. 중계소 필요 없음.
 *   · IP 관련 오류가 나면        → 중계소가 필요하다는 뜻.
 */
export async function gabiaCheck(): Promise<{
  ok: boolean; step: string; detail: string; remain?: number; blockedIp?: string;
}> {
  // 시험에는 발신번호가 필요 없다(보내지 않으므로). ID·키만 있으면 IP 판정이 가능하다.
  if (!process.env.GABIA_SMS_ID || !process.env.GABIA_API_KEY) {
    return { ok: false, step: "열쇠", detail: "GABIA_SMS_ID / GABIA_API_KEY 가 등록되지 않았습니다." };
  }

  /* 중계소를 쓰는 중이면 **중계소 길을 시험한다.** 여기서 가비아를 직접 부르면 IP 에 막히는 게
     당연해서, 정작 실제로 쓰는 길이 살았는지는 알 수 없다.
     방법: 잠근 봉투에 종류를 일부러 엉뚱하게("probe") 넣어 보낸다.
       · bad_kind 가 오면 → 봉투가 열렸다는 뜻. 주소·열쇠·시계가 모두 맞다. **문자는 안 나간다.**
       · unauthorized → 열쇠가 어긋남 · stale → 시계가 5분 이상 어긋남 */
  if (relayUrl()) {
    const r = await viaRelay("probe", { ts: String(Math.floor(Date.now() / 1000)) });
    const msg = r.error ?? "";
    if (msg.includes("bad_kind")) {
      return { ok: true, step: "완료", detail: "중계소까지 길이 열려 있습니다. 잠금과 시계 모두 정상입니다." };
    }
    if (msg.includes("unauthorized")) return { ok: false, step: "중계소 열쇠", detail: "GABIA_RELAY_KEY 가 중계소와 다릅니다." };
    if (msg.includes("stale")) return { ok: false, step: "시계", detail: "양쪽 시각이 5분 이상 차이납니다." };
    if (msg.includes("ip_not_registered")) return { ok: false, step: "중계소 IP", detail: msg };
    return { ok: false, step: "중계소", detail: msg || "중계소가 응답하지 않습니다." };
  }
  cachedToken = null; // 시험은 항상 새로 받아본다(캐시된 토큰이면 IP 검사를 안 거친다)
  const { token, error } = await getToken();
  if (!token) {
    /* 가비아는 막을 때 "(현재 IP : 1.2.3.4)" 로 **부른 쪽 주소를 알려준다.**
       이 주소를 뽑아 두면 "관리툴에 무엇을 등록해야 하는지"가 바로 나온다.
       ⚠️ Cloudflare 는 이 값이 호출할 때마다 달라진다 — 그래서 등록해도 소용없다는 증거이기도 하다. */
    const ip = /(\d{1,3}(?:\.\d{1,3}){3})/.exec(error ?? "")?.[1];
    return {
      ok: false, step: "토큰", detail: error ?? "토큰을 받지 못했습니다.",
      ...(ip ? { blockedIp: ip } : {}),
    };
  }

  // 잔여 건수 조회 — 발송이 아니라 조회라서 차감이 없다.
  try {
    const res = await fetch(`${HOST}/api/user/info`, {
      headers: { Authorization: `Basic ${btoa(`${process.env.GABIA_SMS_ID}:${token}`)}` },
    });
    const j = (await res.json().catch(() => ({}))) as {
      code?: string; message?: string; data?: Record<string, unknown>;
    };
    if (String(j.code) !== "200") {
      return { ok: false, step: "잔여건수 조회", detail: `${j.code ?? ""} ${j.message ?? `HTTP ${res.status}`}`.trim() };
    }
    const qty = Number(j.data?.SMS_QTY ?? j.data?.sms_qty ?? NaN);
    return {
      ok: true,
      step: "완료",
      detail: "토큰 발급과 조회가 모두 됐습니다. Cloudflare 에서 가비아를 직접 부를 수 있습니다.",
      ...(Number.isFinite(qty) ? { remain: qty } : {}),
    };
  } catch (e) {
    return { ok: false, step: "잔여건수 조회", detail: e instanceof Error ? e.message : "조회 실패" };
  }
}
