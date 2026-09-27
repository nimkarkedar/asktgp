"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, LayoutGroup, MotionConfig } from "framer-motion";
import Header from "./Header";
import AskBox from "./AskBox";
import Wall from "./Wall";
import AnswerPanel from "./AnswerPanel";
import { toWallItem, type WallItem } from "./types";
import type { QA } from "@/lib/qa";

const PAGE_SIZE = 30;

// Mark history entries we push, so Close can go back instead of stacking
// another entry (the phone's back gesture then behaves the same as Close).
function pushUrl(url: string) {
  window.history.pushState({ asktgp: true }, "", url);
}
function replaceUrl(url: string) {
  window.history.replaceState({ asktgp: Boolean(window.history.state?.asktgp) }, "", url);
}

export default function AskTGP({ initialItems, initialSlug }: { initialItems: QA[]; initialSlug?: string }) {
  const [items, setItems] = useState<WallItem[]>(() => initialItems.map(toWallItem));
  const [activeKey, setActiveKey] = useState<string | null>(
    () => initialItems.find((i) => i.slug === initialSlug)?.id ?? null
  );
  // Which open item animates from/to its tile. Null when the panel was
  // reached some other way (shared link, previous/next).
  const [morphKey, setMorphKey] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [hasMore, setHasMore] = useState(initialItems.length >= PAGE_SIZE);
  const loadingMore = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const pathname = usePathname();
  // Latest values for async callbacks and the URL effect.
  const itemsRef = useRef(items);
  const activeKeyRef = useRef(activeKey);
  useLayoutEffect(() => {
    itemsRef.current = items;
    activeKeyRef.current = activeKey;
  });

  const active = items.find((i) => i.key === activeKey) ?? null;
  const navigable = items.filter((i) => i.state === "answered" && i.slug);
  const navIndex = active ? navigable.findIndex((i) => i.key === active.key) : -1;

  const finishClose = useCallback(() => {
    const key = activeKeyRef.current;
    setActiveKey(null);
    // Unanswered new questions don't stay on the wall.
    setItems((prev) => prev.filter((i) => i.state === "answered" || i.state === "pending"));
    if (key) {
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(`[data-tile-key="${key}"]`)?.focus({ preventScroll: true })
      );
    }
  }, []);

  // Keep the panel in sync with the URL (back/forward buttons, gestures).
  useEffect(() => {
    const match = pathname.match(/^\/q\/([^/]+)$/);
    if (match) {
      const slug = decodeURIComponent(match[1]);
      const item = itemsRef.current.find((i) => i.slug === slug);
      if (item && item.key !== activeKeyRef.current) {
        setMorphKey(null);
        setActiveKey(item.key);
      }
    } else if (pathname === "/") {
      const current = itemsRef.current.find((i) => i.key === activeKeyRef.current);
      if (current?.slug && current.state === "answered") finishClose();
    }
  }, [pathname, finishClose]);

  function open(item: WallItem) {
    setMorphKey(item.key);
    setActiveKey(item.key);
    if (item.slug && item.state === "answered") pushUrl(`/q/${item.slug}`);
  }

  function close() {
    if (active?.slug && window.location.pathname === `/q/${active.slug}`) {
      if (window.history.state?.asktgp) {
        window.history.back(); // the URL effect finishes the close
        return;
      }
      replaceUrl("/");
    }
    finishClose();
  }

  function go(offset: number) {
    const target = navigable[navIndex + offset];
    if (!target) return;
    setMorphKey(null);
    setActiveKey(target.key);
    replaceUrl(`/q/${target.slug}`);
  }

  async function ask(question: string) {
    const key = `new-${Date.now()}`;
    const pending: WallItem = {
      key,
      id: "",
      slug: "",
      question,
      short_answer: "",
      long_answer: "",
      sources: [],
      created_at: new Date().toISOString(),
      state: "pending",
    };
    setAsking(true);
    setItems((prev) => [pending, ...prev]);
    // Let the new tile render first so the panel can grow out of it.
    requestAnimationFrame(() => {
      setMorphKey(key);
      setActiveKey(key);
    });

    const update = (patch: Partial<WallItem>) =>
      setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();

      if (data.error) {
        // 400 (too long) and 429 (rate limit) carry copy meant for the visitor
        update({
          state: "error",
          message: res.status === 400 || res.status === 429 ? data.error : undefined,
        });
      } else if (data.outOfSyllabus) {
        update({ state: "oos" });
      } else if (data.needsContext) {
        update({ state: "needsContext", message: data.hint });
      } else {
        const slug: string = data.slug ?? "";
        // The same question asked moments ago returns the existing Q&A.
        const existing = slug ? itemsRef.current.find((i) => i.slug === slug && i.key !== key) : undefined;
        if (existing) {
          setItems((prev) => prev.filter((i) => i.key !== key));
          if (activeKeyRef.current === key) {
            setMorphKey(null);
            setActiveKey(existing.key);
            pushUrl(`/q/${slug}`);
          }
          return;
        }
        update({
          state: "answered",
          id: data.id ?? "",
          slug,
          short_answer: data.short ?? "",
          long_answer: data.long ?? "",
          sources: data.sources ?? [],
          created_at: data.created_at ?? pending.created_at,
        });
        if (slug && activeKeyRef.current === key) pushUrl(`/q/${slug}`);
      }
    } catch (err) {
      console.error(err);
      update({ state: "error" });
    } finally {
      setAsking(false);
    }
  }

  // Infinite scroll
  const loadMore = useCallback(async () => {
    if (loadingMore.current) return;
    const last = [...itemsRef.current].reverse().find((i) => i.state === "answered" && i.id);
    if (!last) return;
    loadingMore.current = true;
    try {
      const res = await fetch(`/api/history?before=${encodeURIComponent(last.created_at)}`);
      const data = (await res.json()) as { items?: QA[] };
      const more = data.items ?? [];
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...more.filter((q) => !seen.has(q.id)).map(toWallItem)];
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
    <MotionConfig reducedMotion="user">
      <LayoutGroup>
        <main className="min-h-dvh">
          <Header />
          <AskBox asking={asking} onAsk={ask} />
          <div className="mt-20 lg:mt-36">
            <Wall items={items} hiddenKey={active ? morphKey : null} onOpen={open} />
            {hasMore && <div ref={sentinel} aria-hidden className="h-px" />}
          </div>
        </main>

        <AnimatePresence>
          {active && (
            <AnswerPanel
              key="panel"
              item={active}
              morph={morphKey === active.key}
              onClose={close}
              onPrev={navIndex > 0 ? () => go(-1) : null}
              onNext={navIndex >= 0 && navIndex < navigable.length - 1 ? () => go(1) : null}
            />
          )}
        </AnimatePresence>
      </LayoutGroup>
    </MotionConfig>
  );
}
