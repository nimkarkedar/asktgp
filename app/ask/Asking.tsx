"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AnswerNav from "../components/AnswerNav";
import { AnswerBody, Label, QuestionBox } from "../components/AnswerBody";

type Outcome =
  | { kind: "pending" }
  | { kind: "oos" }
  | { kind: "needsContext"; hint?: string }
  | { kind: "error"; message?: string };

const OOS_LONG =
  "None of the 300+ conversations on The Gyaan Project touch on this yet. AskTGP only answers questions about design and art, and only from what its guests have actually said. Try asking it another way.";

export default function Asking({ question }: { question: string }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<Outcome>({ kind: "pending" });
  const started = useRef(false);

  useEffect(() => {
    // Guard against React Strict Mode running the effect twice in dev.
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
        });
        const data = await res.json();
        if (data.error) {
          // 400 (too long) and 429 (rate limit) carry copy meant for the visitor
          setOutcome({ kind: "error", message: res.status === 400 || res.status === 429 ? data.error : undefined });
        } else if (data.outOfSyllabus) {
          setOutcome({ kind: "oos" });
        } else if (data.needsContext) {
          setOutcome({ kind: "needsContext", hint: data.hint });
        } else if (data.slug) {
          router.replace(`/q/${data.slug}`);
        } else {
          setOutcome({ kind: "error" });
        }
      } catch {
        setOutcome({ kind: "error" });
      }
    })();
  }, [question, router]);

  return (
    <>
      <article className="mx-auto w-full max-w-[592px] px-4 pt-8 lg:pt-14 pb-[calc(96px+env(safe-area-inset-bottom))] lg:pb-0">
        <QuestionBox question={question} />
        {outcome.kind === "pending" && (
          <div className="mt-8 px-1 lg:px-4" aria-live="polite">
            <Label>Short answer</Label>
            <p className="mt-3 dots text-ink-muted" aria-label="Finding an answer">
              <span />
              <span />
              <span />
            </p>
          </div>
        )}
        {outcome.kind === "oos" && <AnswerBody shortAnswer="Not in the archive yet." longAnswer={OOS_LONG} />}
        {outcome.kind === "needsContext" && (
          <AnswerBody
            shortAnswer="Tell me a little more."
            longAnswer={outcome.hint ?? "Try adding a word about design or art to your question."}
          />
        )}
        {outcome.kind === "error" && (
          <p className="mt-8 px-1 lg:px-4 t-body" role="alert">
            {outcome.message ?? "Something went wrong. Please try again."}
          </p>
        )}
      </article>
      <AnswerNav prev={null} next={null} />
    </>
  );
}
