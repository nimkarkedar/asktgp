"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";

const MAX = 300;
const MIN = 8; // shorter than this is rarely a real question
const WARN_FROM = 280;
const MAX_HEIGHT = 16 * 1.6 * 5 + 32; // about 5 lines plus padding

// iOS-style text field: nothing moves. The prompt fades out on focus, a clear
// button appears once there is text, and validation and the character count
// show as quiet supporting text under the field.
export default function AskBox({ asking, onAsk }: { asking: boolean; onAsk: (q: string) => void }) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const supportId = `${id}-support`;

  const showCounter = focused || value.length > 0;
  const nearLimit = value.length >= WARN_FROM;

  function grow() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }

  function validate(q: string): string | null {
    if (!q) return "Type a question first.";
    if (q.length < MIN) return "Add a little more to your question.";
    return null;
  }

  function submit() {
    if (asking) return;
    const q = value.trim();
    const problem = validate(q);
    if (problem) {
      setError(problem);
      ref.current?.focus();
      return;
    }
    onAsk(q);
    setValue("");
    setError(null);
    requestAnimationFrame(grow);
  }

  function clear() {
    setValue("");
    setError(null);
    ref.current?.focus();
    requestAnimationFrame(grow);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Desktop: Enter submits, Shift+Enter is a new line. Phones: Return is a new line.
    const desktop = window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches;
    if (desktop && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape" && value) {
      e.preventDefault();
      clear();
    }
  }

  // The white card's edge; the grey tray around it stays constant.
  const card = error
    ? "border-error"
    : focused
      ? "border-[#b8b8b8] shadow-[0_0_0_4px_rgba(17,17,17,0.04),0_6px_18px_rgba(17,17,17,0.07)]"
      : "border-line shadow-[0_1px_2px_rgba(17,17,17,0.04),0_2px_8px_rgba(17,17,17,0.04)] hover:border-[#cfcfcf]";

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="mx-auto mt-8 lg:mt-9 w-full max-w-[592px] px-4"
    >
      <label htmlFor={id} className="sr-only">
        Ask any question on design and art
      </label>
      {/* A white card sitting in a light tray; the tray's strip carries the
          privacy note, validation messages and the character count. */}
      <div className="rounded-[20px] border border-[#e6e7ec] bg-tray p-1">
        <div className={`relative rounded-2xl border bg-bg transition-[border-color,box-shadow] duration-200 ease-out ${card}`}>
          <textarea
            id={id}
            ref={ref}
            rows={2}
            value={value}
            maxLength={MAX}
            aria-invalid={error ? true : undefined}
            aria-describedby={supportId}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
              grow();
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={onKeyDown}
            placeholder="Ask any question on design and art"
            className="block w-full resize-none rounded-2xl bg-transparent pl-[18px] pr-12 py-4 t-body placeholder:text-ink-muted placeholder:transition-opacity placeholder:duration-200 focus:placeholder:opacity-0 focus:outline-none"
          />

          {value && (
            <button
              type="button"
              onClick={clear}
              onMouseDown={(e) => e.preventDefault() /* keep focus in the field */}
              aria-label="Clear question"
              className="group absolute right-1 top-1.5 flex h-11 w-11 items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-ink rounded-full"
            >
              <svg aria-hidden width="18" height="18" viewBox="0 0 18 18">
                <circle cx="9" cy="9" r="9" className="fill-[#c7c7cc] transition-colors group-hover:fill-[#aeaeb2]" />
                <path d="M6 6l6 6M12 6l-6 6" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        <div id={supportId} className="flex min-h-[50px] sm:min-h-[34px] items-center justify-between gap-4 px-[14px] py-2 t-small">
          {error ? (
            <span role="alert" className="text-error">{error}</span>
          ) : (
            <span className="text-ink-muted">Questions are public. Don&apos;t include personal information.</span>
          )}
          {showCounter && (
            <span className={`shrink-0 tabular-nums ${nearLimit ? "text-error" : "text-ink-muted"}`} aria-live={nearLimit ? "polite" : undefined}>
              {value.length}/{MAX}
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5 lg:pl-1">
        <button
          type="submit"
          disabled={asking}
          aria-label={asking ? "Finding an answer" : "Submit"}
          className="h-12 lg:h-10 w-full lg:w-[110px] shrink-0 rounded-full bg-accent text-white t-heading cursor-pointer transition-[transform,opacity] duration-150 ease-out shadow-[0_2px_6px_rgba(17,17,17,0.12)] hover:opacity-90 active:scale-[0.98] disabled:cursor-default"
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
          Expect a philosophical answer from{" "}
          <Link href="/about" className="underline underline-offset-2 hover:text-ink">
            300+ conversations
          </Link>
        </p>
      </div>
    </form>
  );
}
