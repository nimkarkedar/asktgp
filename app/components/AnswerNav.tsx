"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Session flag set by the homepage when a visitor opens an answer from it,
// so Close can go *back* (restoring the homepage scroll) instead of loading
// the homepage fresh at the top.
export const FROM_HOME_KEY = "asktgp:fromHome";

const SWIPE_X = 60;

export default function AnswerNav({ prev, next }: { prev: string | null; next: string | null }) {
  const router = useRouter();
  const touch = useRef<{ x: number; y: number } | null>(null);

  // Previous / next replace the current entry, so Back and Close still lead
  // to wherever the visitor came from.
  const go = (slug: string | null) => slug && router.replace(`/q/${slug}`, { scroll: true });

  const close = () => {
    let fromHome = false;
    try {
      fromHome = sessionStorage.getItem(FROM_HOME_KEY) === "1";
      sessionStorage.removeItem(FROM_HOME_KEY);
    } catch {
      // storage unavailable
    }
    if (fromHome && window.history.length > 1) router.back();
    else router.push("/");
  };

  // Load the neighbouring answers in the background so previous / next are instant.
  useEffect(() => {
    if (prev) router.prefetch(`/q/${prev}`);
    if (next) router.prefetch(`/q/${next}`);
  }, [prev, next, router]);

  const latest = useRef({ prev, next, go, close });
  useEffect(() => {
    latest.current = { prev, next, go, close };
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, [contenteditable]")) return;
      const l = latest.current;
      if (e.key === "Escape") l.close();
      else if (e.key === "ArrowLeft") l.go(l.prev);
      else if (e.key === "ArrowRight") l.go(l.next);
    }
    function onTouchStart(e: TouchEvent) {
      touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    function onTouchEnd(e: TouchEvent) {
      const start = touch.current;
      touch.current = null;
      if (!start) return;
      const dx = e.changedTouches[0].clientX - start.x;
      const dy = e.changedTouches[0].clientY - start.y;
      if (Math.abs(dx) > SWIPE_X && Math.abs(dx) > Math.abs(dy) * 1.5) {
        const l = latest.current;
        l.go(dx < 0 ? l.next : l.prev);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return (
    <nav
      aria-label="Answers"
      className="sticky lg:static bottom-0 z-10 bg-bg/95 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none pb-[env(safe-area-inset-bottom)] lg:pb-16 lg:pt-6"
    >
      <div className="mx-auto flex max-w-[592px] items-center justify-between px-4 py-2 lg:px-4">
        <NavButton label="Previous answer" onClick={prev ? () => go(prev) : null}>
          <path d="M19 12H5M11 6l-6 6 6 6" />
        </NavButton>
        <NavButton label="Close" onClick={close} primary>
          <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
        </NavButton>
        <NavButton label="Next answer" onClick={next ? () => go(next) : null}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </NavButton>
      </div>
    </nav>
  );
}

// Round icon buttons, thick rounded strokes. Close is the filled primary.
function NavButton({
  label,
  onClick,
  primary = false,
  children,
}: {
  label: string;
  onClick: (() => void) | null;
  primary?: boolean;
  children: React.ReactNode;
}) {
  const look = primary
    ? "bg-ink text-surface hover:bg-[#2b2b2b]"
    : "bg-surface text-ink border border-line shadow-[0_1px_2px_rgba(17,17,17,0.05)] hover:border-[#cfcbc3] disabled:text-[#c9c5bd] disabled:shadow-none";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick ?? undefined}
      disabled={!onClick}
      className={`flex h-12 w-12 items-center justify-center rounded-full cursor-pointer transition-[transform,background-color,border-color] duration-150 ease-out active:scale-95 disabled:cursor-default disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${look}`}
    >
      <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}
