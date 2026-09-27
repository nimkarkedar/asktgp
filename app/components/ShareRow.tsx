"use client";

import { useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

// Brand marks (Simple Icons, CC0), drawn in currentColor so they stay black.
const WHATSAPP =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z";
const X_MARK =
  "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z";
const LINKEDIN =
  "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z";

// Icons sit on the page background; on hover every button gets the same
// round background. Icons stay black.
const BUTTON =
  "flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors duration-150 cursor-pointer hover:bg-tile focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

function Filled({ d }: { d: string }) {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d={d} />
    </svg>
  );
}

function Stroked({ children }: { children: React.ReactNode }) {
  return (
    <svg aria-hidden width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export default function ShareRow({ question, slug }: { question: string; slug: string }) {
  const [copied, setCopied] = useState(false);

  // Browser-only facts; the server snapshot keeps hydration consistent.
  const canShare = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches,
    () => false
  );
  const origin = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "https://asktgp.com");

  const url = `${origin}/q/${slug}`;
  const text = `${question} — asktgp`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  }

  async function share() {
    try {
      await navigator.share({ title: question, text, url });
    } catch {
      // cancelled
    }
  }

  return (
    <div className="relative mt-8 flex flex-col items-center">
      <div className="flex items-center justify-center gap-2">
        {canShare && (
          <button type="button" onClick={share} aria-label="Share" title="Share" className={BUTTON}>
            <Stroked>
              <path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
            </Stroked>
          </button>
        )}
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Link copied" : "Copy link"}
          title={copied ? "Link copied" : "Copy link"}
          className={BUTTON}
        >
          <Stroked>
            {copied ? (
              <path d="M20 6 9 17l-5-5" />
            ) : (
              <>
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </>
            )}
          </Stroked>
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on WhatsApp"
          title="WhatsApp"
          className={BUTTON}
        >
          <Filled d={WHATSAPP} />
        </a>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on X"
          title="X"
          className={BUTTON}
        >
          <Filled d={X_MARK} />
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on LinkedIn"
          title="LinkedIn"
          className={BUTTON}
        >
          <Filled d={LINKEDIN} />
        </a>
      </div>
      {/* Confirmation sits under the icons without shifting the layout. */}
      <p aria-live="polite" className="absolute top-full mt-1 t-small text-ink-muted">
        {copied ? "Link copied" : ""}
      </p>
    </div>
  );
}
