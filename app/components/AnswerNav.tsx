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
      <div className="mx-auto grid max-w-[592px] grid-cols-3 px-4 lg:px-8 t-small uppercase tracking-[0.12em]">
        <NavButton onClick={prev ? () => go(prev) : null} className="justify-self-start">← Previous</NavButton>
        <NavButton onClick={close} className="justify-self-center">× Close</NavButton>
        <NavButton onClick={next ? () => go(next) : null} className="justify-self-end">Next →</NavButton>
      </div>
    </nav>
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
      className={`${className} min-h-12 px-1 cursor-pointer hover:text-ink-muted disabled:text-ink-muted disabled:cursor-default`}
    >
      {children}
    </button>
  );
}
