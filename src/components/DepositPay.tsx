"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

/* 계좌 값 자체는 lib/pay.ts 가 출처다 (챗봇처럼 글자만 필요한 곳이
   QR 라이브러리까지 끌고 오지 않도록 분리해 뒀다). */
import { PAY_BANK, PAY_ACCT, PAY_ACCT_NO, PAY_HOLDER, tossSendLink } from "@/lib/pay";

/** 은행 · 계좌번호 · 예금주를 보여주는 칸 */
export function PayAccount() {
  return (
    <div className="pay-acct">
      <div className="pay-acct-info">
        <span className="pay-bank">{PAY_BANK}</span>
        <b>{PAY_ACCT}</b>
        <span className="pay-holder">{PAY_HOLDER}</span>
      </div>
    </div>
  );
}

/** 송금 버튼 묶음 — 휴대폰이면 앱 딥링크, PC면 QR + 계좌 복사.
 *
 *  어떤 버튼을 눌러도 **계좌번호는 항상 먼저 복사**된다. 앱이 안 열려도(딥링크 실패)
 *  손님이 은행앱에 붙여넣을 수 있으므로 손해가 없다. */
export function PayActions({ amount }: { amount: number }) {
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    setIsMobile(/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent));
  }, []);

  // PC 에서는 QR 을 만든다(폰으로 스캔 → 토스 송금이 열림)
  useEffect(() => {
    if (isMobile || amount <= 0) return;
    QRCode.toDataURL(tossSendLink(amount), { margin: 1, width: 220 })
      .then(setQrUrl)
      .catch(() => setQrUrl(""));
  }, [isMobile, amount]);

  async function copyAcct() {
    try { await navigator.clipboard.writeText(PAY_ACCT_NO); }
    catch { prompt("계좌번호를 복사하세요", PAY_ACCT_NO); } // http·구형 브라우저 폴백
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }
  function openToss() { copyAcct(); window.location.href = tossSendLink(amount); }
  // 카카오뱅크는 앱만 열리므로(계좌 지정 불가) 계좌를 미리 복사해 붙여넣게 한다.
  function openKakaoBank() { copyAcct(); window.location.href = "kakaobank://"; }

  if (isMobile) {
    return (
      <div className="pay-actions">
        <button className="btn primary pay-toss" onClick={openToss}>
          토스로 바로 송금<span className="pay-sub">계좌·금액 자동</span>
        </button>
        <div className="pay-two">
          <button className="btn ghost" onClick={openKakaoBank}>카카오뱅크 앱</button>
          <button className="btn ghost" onClick={copyAcct}>{copied ? "복사됨" : "계좌 복사"}</button>
        </div>
      </div>
    );
  }
  return (
    <div className="pay-actions">
      {qrUrl && (
        <div className="pay-qr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="토스 송금 QR 코드" width={140} height={140} />
          <span>휴대폰으로 스캔하면 토스 송금이 열려요</span>
        </div>
      )}
      <button className="btn primary" onClick={copyAcct}>
        {copied ? "계좌번호 복사됨" : "계좌번호 복사"}
      </button>
    </div>
  );
}
