"use client";

import { useState } from "react";
import Header from "../components/Header";
import ShareRow from "../components/ShareRow";
import PaymentLogos from "../components/PaymentLogos";

const UPI_ID = "9886219108@ybl";
const PAYEE_NAME = "Kedar Nimkar";
const link = "underline underline-offset-2 hover:text-ink-muted";

export default function Donate() {
  const [upiCopied, setUpiCopied] = useState(false);

  async function copyUpi() {
    try {
      await navigator.clipboard.writeText(UPI_ID);
    } catch {
      // noop
    }
    setUpiCopied(true);
    setTimeout(() => setUpiCopied(false), 2000);
  }

  return (
    <main className="flex-1">
      <Header />
      <article className="mx-auto max-w-[592px] px-4 pt-12 lg:pt-16 pb-24">
        <h1 className="t-title">Support</h1>

        <div className="mt-8 space-y-5 t-body">
          <p>
            <a href="https://thegyaanproject.com" target="_blank" rel="noopener noreferrer" className={link}>The Gyaan Project</a>{" "}
            and askTGP is labour of love since 2016. This is a solo effort and my way of giving back to design and art community.
            <br />
            All this takes time, effort and money. I would like to keep the project running for a long time and as authentic I can.
            <br />
            Thats only possible with generous donations from patrons like you.
          </p>
          <p>
            I will be investing the donated money in buying AI tools, research and improving the production quality of the
            episodes. Of course, the money will be used to keep these kind of sites up and running.
          </p>
          <p>
            You can donate as per your wish.
            <br />
            Thanks in advance.
          </p>
        </div>

        <div className="mt-12 flex flex-col items-center gap-6">
          {/* Static QR for UPI_ID (no amount: the visitor enters it in their app).
              Generated once into /public; regenerate if the UPI ID changes. */}
          <div className="w-full rounded-2xl border border-line bg-surface p-6 flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/upi-qr.svg"
              alt={`UPI QR code to pay ${PAYEE_NAME} (${UPI_ID})`}
              width={260}
              height={260}
              className="w-[240px] h-[240px] lg:w-[260px] lg:h-[260px]"
            />
            <p className="mt-4 t-small text-ink-muted">Scan to pay</p>
          </div>

          <div className="w-full">
            <p className="mb-2 text-center t-small text-ink-muted">Or pay using the UPI ID</p>

            {/* UPI ID card: who you are paying, a one-tap copy, and which apps work. */}
            <div className="rounded-2xl border border-line bg-surface px-4 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="t-small text-ink-muted">UPI ID · {PAYEE_NAME}</p>
                  <p className="t-heading break-words">
                    {UPI_ID.split("@")[0]}@<wbr />
                    {UPI_ID.split("@")[1]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyUpi}
                  aria-live="polite"
                  className="relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 t-small text-ink cursor-pointer transition-colors duration-150 hover:bg-tile after:absolute after:-inset-1 after:content-['']"
                >
                  <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                    {upiCopied ? (
                      <path d="M20 6 9 17l-5-5" />
                    ) : (
                      <>
                        <rect x="9" y="9" width="12" height="12" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </>
                    )}
                  </svg>
                  {upiCopied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-3 t-small text-ink-muted">
                <PaymentLogos /> or any UPI app
              </p>
            </div>
          </div>

          <div className="w-full">
            <p className="text-center t-small text-ink-muted">Share this page</p>
            <ShareRow title="Support asktgp" path="/donate" text="Help keep The Gyaan Project going." className="mt-2" />
          </div>
        </div>
      </article>
    </main>
  );
}
