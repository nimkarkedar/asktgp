"use client";

import { useEffect, useState } from "react";

// Status lines shown while an answer is being written, in the spirit of
// Claude's "working" messages. Shuffled per visit, never the same twice in a row.
const PHRASES = [
  "Diving deep into the archive",
  "Asking oracles",
  "Fetching records",
  "Tripping",
  "Seems like I am hallucinating",
  "Checking with monks",
  "Researching vedas and upanishads",
  "Making sense",
  "Connecting dots",
  "Rewinding ten years of tapes",
  "Brewing chai for the guests",
  "Listening between the lines",
  "Dusting off old transcripts",
  "Arguing with myself",
  "Summoning the muse",
  "Squinting at footnotes",
  "Consulting 300 wise people",
  "Meditating on it",
];

const INTERVAL = 2200;

function shuffled<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Thinking() {
  // Start from a fixed phrase so server and client render the same HTML;
  // the shuffled sequence takes over after the first interval.
  const [order] = useState(() => [PHRASES[0], ...shuffled(PHRASES.slice(1))]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % order.length), INTERVAL);
    return () => clearInterval(id);
  }, [order.length]);

  return (
    <div className="mt-8 flex items-center gap-3 px-1 lg:px-4" role="status" aria-live="polite">
      <span aria-hidden className="thinking-glyph text-accent">✻</span>
      <p key={index} className="thinking-line t-body font-bold text-accent">
        {order[index]}…
      </p>
    </div>
  );
}
