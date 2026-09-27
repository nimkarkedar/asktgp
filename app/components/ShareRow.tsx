"use client";

import { useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

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

  const link = "inline-flex items-center min-h-11 underline underline-offset-2 hover:text-ink-muted cursor-pointer";
  const dot = <span aria-hidden className="text-ink-muted">·</span>;

  return (
    <div className="mt-6 px-1 lg:px-4 flex flex-wrap items-center gap-x-3 t-small">
      {canShare && (
        <>
          <button type="button" onClick={share} className={link}>Share</button>
          {dot}
        </>
      )}
      <button type="button" onClick={copy} className={link} aria-live="polite">
        {copied ? "Link copied" : "Copy link"}
      </button>
      {!canShare && (
        <>
          {dot}
          <a className={link} target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}>WhatsApp</a>
          {dot}
          <a className={link} target="_blank" rel="noopener noreferrer" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}>X</a>
          {dot}
          <a className={link} target="_blank" rel="noopener noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}>LinkedIn</a>
        </>
      )}
    </div>
  );
}
