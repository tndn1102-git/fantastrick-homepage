import { NextRequest, NextResponse } from "next/server";
import { getSupabase, DB_NOT_CONFIGURED } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";
import { sanitizeText } from "@/lib/util";
import { themeById } from "@/lib/data";
import { fetchBlogReview } from "@/lib/blog-review";

const COLS = "id, theme_id, theme_name, name, phone, body, source, source_url, status, created_at";

// 리뷰 목록 (관리자) — ?status=pending|approved|all (기본 pending)
export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const db = getSupabase();
  if (!db) return NextResponse.json(DB_NOT_CONFIGURED, { status: 503 });

  const status = req.nextUrl.searchParams.get("status") || "pending";
  let q = db.from("reviews").select(COLS).order("created_at", { ascending: false }).limit(300);
  if (status !== "all") q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: "리뷰 조회 중 오류가 발생했습니다." }, { status: 500 });
  return NextResponse.json({ ok: true, reviews: data || [] });
}

// 리뷰 모더레이션 / 외부 후기 수동 등록 / 삭제
export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const db = getSupabase();
  if (!db) return NextResponse.json(DB_NOT_CONFIGURED, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 }); }

  const action = String(body.action || "");

  // 상태 변경 (승인/거부/게시취소)
  if (action === "moderate") {
    const id = String(body.id || "");
    const status = String(body.status || "");
    if (!id) return NextResponse.json({ error: "대상 후기를 찾을 수 없습니다." }, { status: 400 });
    if (!["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json({ error: "상태 값이 올바르지 않습니다." }, { status: 400 });
    }
    const { error } = await db.from("reviews").update({ status }).eq("id", id);
    if (error) return NextResponse.json({ error: "상태 변경 중 오류가 발생했습니다." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  /* 블로그 주소 하나로 후기 등록 — **주소만 넣으면 나머지는 전부 자동이다.**
     preview: true 면 읽어보기만 하고 저장하지 않는다(화면에서 확인용).

     ⚠️ 별점 제도 자체가 없어졌다(2026-08-13). rating 칸은 옛 자료 때문에 남아 있을 뿐 쓰지 않는다.
     ⚠️ 전문이 아니라 발췌만 담는다. 원문 링크가 함께 가므로 읽고 싶은 사람은 원글로 간다. */
  if (action === "import") {
    const url = String(body.url || "").trim();
    const draft = await fetchBlogReview(url);
    if (!draft.ok) return NextResponse.json({ error: draft.error }, { status: 400 });

    // 테마를 못 고르면 저장하지 않는다 — 엉뚱한 테마에 붙은 후기는 손님을 헷갈리게 한다.
    const themeId = String(body.themeId || draft.themeId || "");
    const theme = themeById(themeId);
    if (!theme) {
      return NextResponse.json({
        error: "글에서 테마 이름을 못 찾았습니다. 테마를 직접 골라 다시 눌러주세요.", draft,
      }, { status: 400 });
    }
    if (body.preview) return NextResponse.json({ ok: true, draft: { ...draft, themeId: theme.id, themeName: theme.name } });

    // 같은 글을 두 번 올리지 않는다.
    const { data: dup } = await db.from("reviews").select("id").eq("source_url", draft.url!).maybeSingle();
    if (dup) return NextResponse.json({ error: "이미 등록된 글입니다." }, { status: 409 });

    /* 사장님 방침(2026-08-11): 여기에 올리는 블로그는 **전부 직접 연락해 동의를 받은 것**이다.
   그래서 비워두면 그 사실을 기본으로 남긴다. 동의 시각(consent_at)은 등록 시각으로 함께 찍힌다.
   ⚠️ 동의 없는 글을 올리는 통로가 되면 안 된다 — 붙여넣기 전에 동의부터가 순서다. */
const consentNote = sanitizeText(String(body.consentNote || "")) || "사장님이 작성자에게 직접 연락해 동의 받음";
    const row: Record<string, unknown> = {
      theme_id: theme.id,
      theme_name: theme.name,
      name: draft.author,
      phone: null,
      body: draft.excerpt,
      status: "approved",
      source: "네이버 블로그",
      source_url: draft.url,
      consent_note: consentNote,
      consent_at: new Date().toISOString(),
      /* 후기 날짜 = **원글이 쓰인 날**. 우리가 옮겨 담은 날이 아니다.
         등록일을 보여주면 2년 전 후기가 오늘 쓴 것처럼 보인다 — 손님을 속이는 셈이 된다.
         목록 정렬도 이 값을 쓰므로, 원글 순서대로 놓인다. */
      ...(draft.postedAt ? { created_at: new Date(draft.postedAt + "T12:00:00+09:00").toISOString() } : {}),
    };
    const { error } = await db.from("reviews").insert(row);
    if (error) {
      // 표를 아직 안 고쳤을 때 무엇을 해야 하는지 알려준다.
      if (/source_url|consent_note|consent_at|rating|phone/.test(error.message || "")) {
        return NextResponse.json({
          error: "표에 칸이 아직 없습니다. supabase/migration_review_source_url_APPLY_ME.sql 을 Supabase SQL Editor 에서 한 번 실행해 주세요.",
        }, { status: 503 });
      }
      return NextResponse.json({ error: "후기 등록 중 오류가 발생했습니다." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, draft });
  }

  // 외부 후기 수동 등록 (예약이력 검증 없음 — 관리자 우회, 즉시 게시)
  if (action === "add") {
    const themeId = String(body.themeId || "");
    const name = sanitizeText(String(body.name || ""));
    const text = sanitizeText(String(body.body || ""));
    const source = sanitizeText(String(body.source || "")) || "외부";

    const theme = themeById(themeId);
    if (!theme) return NextResponse.json({ error: "테마를 선택해 주세요." }, { status: 400 });
    if (!name) return NextResponse.json({ error: "이름(닉네임)을 입력해 주세요." }, { status: 400 });
    if (name.length > 40) return NextResponse.json({ error: "이름이 너무 깁니다." }, { status: 400 });
    if (source.length > 20) return NextResponse.json({ error: "출처가 너무 깁니다." }, { status: 400 });
    if (text.length < 5) return NextResponse.json({ error: "후기를 5자 이상 입력해 주세요." }, { status: 400 });
    if (text.length > 1000) return NextResponse.json({ error: "후기는 1000자 이내로 입력해 주세요." }, { status: 400 });

    const { error } = await db.from("reviews").insert({
      theme_id: theme.id,
      theme_name: theme.name,
      name,
      phone: "", // 외부 후기는 전화번호 없음
      body: text,
      status: "approved", // 관리자 등록은 즉시 게시
      source,
    });
    if (error) return NextResponse.json({ error: "후기 등록 중 오류가 발생했습니다." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // 삭제
  if (action === "delete") {
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "대상 후기를 찾을 수 없습니다." }, { status: 400 });
    const { error } = await db.from("reviews").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "삭제 중 오류가 발생했습니다." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "알 수 없는 요청입니다." }, { status: 400 });
}
