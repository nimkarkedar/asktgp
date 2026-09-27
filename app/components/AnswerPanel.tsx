"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import Header from "./Header";
import type { WallItem } from "./types";

const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3, ease: "easeOut" as const },
};

const noopSubscribe = () => () => {};

const SWIPE_X = 60;
const SWIPE_DOWN = 90;

export default function AnswerPanel({
  item,
  morph,
  onClose,
  onPrev,
  onNext,
}: {
  item: WallItem;
  morph: boolean;
  onClose: () => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number; top: number } | null>(null);

  // Keep latest handlers for the document-level key listener.
  const handlers = useRef({ onClose, onPrev, onNext });
  useLayoutEffect(() => {
    handlers.current = { onClose, onPrev, onNext };
  });

  // Lock page scroll, move focus in, trap Tab, and handle Esc / arrows.
  useEffect(() => {
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    rootRef.current?.focus({ preventScroll: true });

    function onKey(e: KeyboardEvent) {
      const h = handlers.current;
      if (e.key === "Escape") {
        e.preventDefault();
        h.onClose();
      } else if (e.key === "ArrowLeft" && h.onPrev) {
        h.onPrev();
      } else if (e.key === "ArrowRight" && h.onNext) {
        h.onNext();
      } else if (e.key === "Tab" && rootRef.current) {
        const focusables = rootRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === rootRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      html.style.overflow = prevOverflow;
    };
  }, []);

  // Start each answer at the top when moving previous / next.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [item.key]);

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, top: scrollRef.current?.scrollTop ?? 0 };
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > SWIPE_X && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) onNext?.();
      else onPrev?.();
    } else if (dy > SWIPE_DOWN && start.top <= 0 && dy > Math.abs(dx) * 1.5) {
      onClose();
    }
  }

  return (
    <motion.div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={item.question}
      tabIndex={-1}
      layoutRoot
      className="fixed inset-0 z-50 outline-none"
    >
      <motion.div {...fade} className="absolute inset-0 bg-bg" />

      <motion.div
        ref={scrollRef}
        layoutScroll
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative h-full overflow-y-auto overscroll-contain"
      >
        <motion.div {...fade}>
          <Header onWordmarkClick={onClose} />
        </motion.div>

        <div className="mx-auto w-full max-w-[592px] px-4 pt-8 lg:pt-14 pb-[calc(96px+env(safe-area-inset-bottom))] lg:pb-10">
          <motion.div
            layoutId={morph ? `tile-${item.key}` : undefined}
            style={{ borderRadius: 16 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-tile px-5 lg:px-6 py-7 lg:py-10"
          >
            <h1 className="t-heading">{item.question}</h1>
          </motion.div>

          <motion.div key={item.key} {...fade} transition={{ duration: 0.3, ease: "easeOut", delay: morph ? 0.12 : 0 }} className="px-1 lg:px-4">
            <PanelBody item={item} />
          </motion.div>
        </div>

        <motion.nav
          {...fade}
          aria-label="Answers"
          className="fixed lg:static bottom-0 inset-x-0 bg-bg/95 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none pb-[env(safe-area-inset-bottom)] lg:pb-16"
        >
          <div className="mx-auto grid max-w-[592px] grid-cols-3 px-4 lg:px-8 t-small uppercase tracking-[0.12em]">
            <NavButton onClick={onPrev} className="justify-self-start">← Previous</NavButton>
            <NavButton onClick={onClose} className="justify-self-center">× Close</NavButton>
            <NavButton onClick={onNext} className="justify-self-end">Next →</NavButton>
          </div>
        </motion.nav>
      </motion.div>
    </motion.div>
  );
}

function NavButton({
  onClick,
  className,
  children,
}: {
  onClick: (() => void) | null;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick ?? undefined}
      disabled={!onClick}
      className={`${className} min-h-12 px-1 cursor-pointer hover:opacity-60 disabled:opacity-25 disabled:cursor-default`}
    >
      {children}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="t-heading">{children}</p>;
}

function PanelBody({ item }: { item: WallItem }) {
  if (item.state === "pending") {
    return (
      <div className="mt-8" aria-live="polite">
        <Label>Short answer</Label>
        <p className="mt-3 dots text-ink-muted" aria-label="Finding an answer">
          <span />
          <span />
          <span />
        </p>
      </div>
    );
  }

  if (item.state === "error") {
    return (
      <p className="mt-8 t-body" role="alert">
        {item.message ?? "Something went wrong. Please try again."}
      </p>
    );
  }

  if (item.state === "oos" || item.state === "needsContext") {
    const short = item.state === "oos" ? "Not in the archive yet." : "Tell me a little more.";
    const long =
      item.state === "oos"
        ? "None of the 300+ conversations on The Gyaan Project touch on this yet. AskTGP only answers questions about design and art, and only from what its guests have actually said. Try asking it another way."
        : item.message ?? "Try adding a word about design or art to your question.";
    return (
      <>
        <div className="mt-8">
          <Label>Short answer</Label>
          <p className="mt-2 t-body">{short}</p>
        </div>
        <p className="mt-8 max-w-[65ch] t-body">{long}</p>
      </>
    );
  }

  const paragraphs = item.long_answer.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <>
      <div className="mt-8">
        <Label>Short answer</Label>
        <p className="mt-2 t-body">{item.short_answer}</p>
      </div>

      <div className="mt-8">
        <Label>Long answer</Label>
        <div className="mt-2 max-w-[65ch] space-y-4 t-body">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>

      {item.sources.length > 0 && (
        <p className="mt-8 t-small">
          Reference found in conversations with{" "}
          {item.sources.map((s, i) => (
            <span key={s.guest}>
              {i > 0 && ", "}
              <i>{s.guest}</i>
            </span>
          ))}
        </p>
      )}

      {item.slug && <ShareRow question={item.question} slug={item.slug} />}
    </>
  );
}

function ShareRow({ question, slug }: { question: string; slug: string }) {
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

  const link = "inline-flex items-center min-h-11 underline underline-offset-2 hover:opacity-60 cursor-pointer";
  const dot = <span aria-hidden className="text-ink-muted">·</span>;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-3 t-small">
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
