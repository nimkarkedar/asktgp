"use client";

import { useRef, useState } from "react";

const MAX = 300;
const COUNTER_FROM = 250;
const MAX_HEIGHT = 16 * 1.6 * 5 + 40; // about 5 lines plus padding

export default function AskBox({ asking, onAsk }: { asking: boolean; onAsk: (q: string) => void }) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  function grow() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }

  function submit() {
    const q = value.trim();
    if (!q || asking) return;
    onAsk(q);
    setValue("");
    requestAnimationFrame(grow);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Desktop: Enter submits, Shift+Enter is a new line. Phones: Return is a new line.
    const desktop = window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches;
    if (desktop && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="mx-auto mt-8 lg:mt-9 w-full max-w-[592px] px-4"
    >
      <div className="relative">
        <label htmlFor="ask" className="sr-only">Your question</label>
        <textarea
          id="ask"
          ref={ref}
          rows={2}
          value={value}
          maxLength={MAX}
          onChange={(e) => {
            setValue(e.target.value);
            grow();
          }}
          onKeyDown={onKeyDown}
          placeholder="Ask any question on design and art"
          className="block w-full resize-none rounded-2xl border border-line bg-bg px-[18px] pt-4 pb-6 t-body placeholder:text-ink focus:border-ink focus:outline-none"
        />
        {value.length >= COUNTER_FROM && (
          <span aria-live="polite" className="absolute right-4 bottom-2 t-small text-ink-muted">
            {value.length}/{MAX}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4 lg:pl-[10px]">
        <button
          type="submit"
          disabled={asking}
          aria-label={asking ? "Finding an answer" : "Submit"}
          className="h-12 lg:h-10 w-full lg:w-[110px] shrink-0 rounded-full bg-accent text-white t-heading cursor-pointer disabled:cursor-default"
        >
          {asking ? (
            <span className="dots" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          ) : (
            "Submit"
          )}
        </button>
        <p className="text-center lg:text-left t-small text-ink-muted">
          Questions are public. Don&apos;t include personal information.
        </p>
      </div>
    </form>
  );
}
