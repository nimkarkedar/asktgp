"use client";

import { useState } from "react";
import Header from "../components/Header";

const UPI_ID = "9886219108@okhdfcbank";
const PAYEE_NAME = "Kedar Nimkar";
const PRESETS = [100, 200, 500, 1000, 2000];

function buildUpiUrl(amount: number) {
  const params = new URLSearchParams({
    pa: UPI_ID,
    pn: PAYEE_NAME,
    am: String(amount),
    cu: "INR",
  });
  return `upi://pay?${params.toString()}`;
}

function qrSrc(amount: number) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=16&data=${encodeURIComponent(
    buildUpiUrl(amount)
  )}`;
}

const link = "underline underline-offset-2 hover:text-ink-muted";

export default function Donate() {
  const [amount, setAmount] = useState<number>(100);
  const [copied, setCopied] = useState(false);

  async function copyUpi() {
    try {
      await navigator.clipboard.writeText(UPI_ID);
    } catch {
      // noop
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function sharePage() {
    const shareData = {
      title: "Support Ask TGP",
      text: "Help keep The Gyaan Project going.",
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // user cancelled
      }
    }
    try {
      await navigator.clipboard.writeText(shareData.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // noop
    }
  }

  return (
    <main className="flex-1">
      <Header />
      <article className="mx-auto max-w-[592px] px-4 pt-12 lg:pt-16 pb-24">
        <h1 className="t-heading">Support</h1>

        <div className="mt-8 space-y-5 t-body">
          <p>
            <a href="https://thegyaanproject.com" target="_blank" rel="noopener noreferrer" className={link}>The Gyaan Project</a>{" "}
            and now askTGP is labour of love since 2016. I have made more than 300+ episodes and ongoing TGP SamaChar.
            This is a solo effort and my way of giving back to design and art community. The Gyaan Project is one of the
            longest and consistent podcast and youtube channel in India.
          </p>
          <p>All this takes time, effort and money. I would like to keep the project running for a long time and as authentic I can.</p>
          <p>Thats only possible with generous donations from patrons like you.</p>
          <p>
            I will be investing the donated money in buying AI tools, research and improving the production quality of
            the episodes. Of course, the money will be used to keep these kind of sites up and running.
          </p>
          <p>
            You can donate from ₹100 all the way to ₹2,000 rupees.
            <br />
            Thanks in advance.
          </p>
        </div>

        <div className="mt-12 flex flex-col items-center gap-6">
          <div className="w-full rounded-2xl border border-line p-6 flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={amount}
              src={qrSrc(amount)}
              alt={`Scan to send ₹${amount}`}
              width={260}
              height={260}
              className="w-[240px] h-[240px] lg:w-[260px] lg:h-[260px]"
            />
            <p className="mt-4 t-small text-ink-muted">Scan to send ₹{amount.toLocaleString("en-IN")}</p>
          </div>

          <label className="w-full">
            <span className="sr-only">Amount in rupees</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={amount}
              onChange={(e) => {
                const n = parseInt(e.target.value);
                setAmount(Number.isFinite(n) && n > 0 ? n : 0);
              }}
              className="w-full rounded-2xl border border-line px-[18px] py-3 t-body bg-bg focus:outline-none focus:border-ink"
            />
          </label>

          <div className="w-full flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(p)}
                aria-pressed={amount === p}
                className={`min-h-11 px-4 rounded-full border t-small cursor-pointer transition-colors ${
                  amount === p ? "border-ink bg-ink text-bg" : "border-line hover:border-ink"
                }`}
              >
                ₹{p.toLocaleString("en-IN")}
              </button>
            ))}
          </div>

          <div className="w-full flex flex-col items-center gap-1 text-center t-small">
            <p>Send custom amount?</p>
            <button type="button" onClick={copyUpi} className="min-h-11 text-ink-muted hover:text-ink cursor-pointer" aria-live="polite">
              UPI: {UPI_ID} {copied ? "· Copied" : "· Copy"}
            </button>
            <button type="button" onClick={sharePage} className={`min-h-11 cursor-pointer ${link}`}>
              Share this page
            </button>
          </div>
        </div>
      </article>
    </main>
  );
}
