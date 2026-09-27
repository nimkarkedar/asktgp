"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "./Header";
import AskBox from "./AskBox";
import Wall from "./Wall";
import { FROM_HOME_KEY } from "./AnswerNav";
import type { QA } from "@/lib/qa";

const PAGE_SIZE = 30;

// Homepage: header, ask box and the questions wall. Answers open as their own
// pages (/q/{slug}); a new question goes to /ask, which hands over to /q/{slug}.
export default function AskTGP({ initialItems }: { initialItems: QA[] }) {
  const router = useRouter();
  const [items, setItems] = useState<QA[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialItems.length >= PAGE_SIZE);
  const loadingMore = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  });

  // Back on the homepage: any "came from home" flag is spent. Only a fresh
  // tile click or question sets it again.
  useEffect(() => {
    try {
      sessionStorage.removeItem(FROM_HOME_KEY);
    } catch {
      // storage unavailable
    }
  }, []);

  function markFromHome() {
    try {
      sessionStorage.setItem(FROM_HOME_KEY, "1");
    } catch {
      // storage unavailable
    }
  }

  function ask(question: string) {
    markFromHome();
    router.push(`/ask?q=${encodeURIComponent(question)}`);
  }

  // Infinite scroll
  const loadMore = useCallback(async () => {
    if (loadingMore.current) return;
    const last = itemsRef.current[itemsRef.current.length - 1];
    if (!last) return;
    loadingMore.current = true;
    try {
      const res = await fetch(`/api/history?before=${encodeURIComponent(last.created_at)}`);
      const data = (await res.json()) as { items?: QA[] };
      const more = data.items ?? [];
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...more.filter((q) => !seen.has(q.id))];
      });
      setHasMore(more.length >= PAGE_SIZE);
    } catch (err) {
      console.error(err);
    } finally {
      loadingMore.current = false;
    }
  }, []);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), {
      rootMargin: "600px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore]);

  return (
    <main className="min-h-dvh">
      <Header />
      <AskBox asking={false} onAsk={ask} />
      <div className="mt-20 lg:mt-36">
        <Wall items={items} onOpen={markFromHome} />
        {hasMore && <div ref={sentinel} aria-hidden className="h-px" />}
      </div>
    </main>
  );
}
