"use client";

import { useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import type { WallItem } from "./types";

const MIN_ROWS = 6;

// Tiles per row: always one more than fits, so rows bleed off the screen
// edges (PRD §9.5). Mobile is fixed at two columns.
function computeTilesPerRow(): number {
  const vw = window.innerWidth;
  if (vw < 640) return 2;
  const [tile, gap] = vw < 1024 ? [240, 20] : [265, 36];
  return Math.max(3, Math.floor((vw + gap) / (tile + gap)) + 1);
}

function subscribe(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

function useTilesPerRow() {
  return useSyncExternalStore(subscribe, computeTilesPerRow, () => 2);
}

export default function Wall({
  items,
  hiddenKey,
  onOpen,
}: {
  items: WallItem[];
  hiddenKey: string | null;
  onOpen: (item: WallItem) => void;
}) {
  const perRow = useTilesPerRow();
  // Pad with empty tiles: at least MIN_ROWS rows, and never a ragged last row,
  // so the wall reads as a wall even before many questions exist.
  const total = Math.max(MIN_ROWS * perRow, Math.ceil(items.length / perRow) * perRow);
  const cells: (WallItem | null)[] = [...items, ...Array<null>(total - items.length).fill(null)];
  const rows: (WallItem | null)[][] = [];
  for (let i = 0; i < cells.length; i += perRow) rows.push(cells.slice(i, i + perRow));

  return (
    <section aria-label="Questions asked by others" className="wall w-full overflow-hidden pb-16">
      <div className="flex flex-col gap-[var(--tile-gap)] lg:gap-7">
        {rows.map((row, r) => (
          <div
            key={r}
            className="flex flex-nowrap justify-center gap-[var(--tile-gap)]"
            style={r % 2 === 1 ? { transform: "translateX(calc((var(--tile-w) + var(--tile-gap)) / 2))" } : undefined}
          >
            {row.map((item, c) =>
              item === null ? (
                <div key={`empty-${r}-${c}`} aria-hidden className="shrink-0 w-[var(--tile-w)] h-[var(--tile-h)] rounded-2xl bg-tile" />
              ) : item.key === hiddenKey ? (
                <div key={item.key} aria-hidden className="shrink-0 w-[var(--tile-w)] h-[var(--tile-h)]" />
              ) : (
                <motion.button
                  key={item.key}
                  type="button"
                  layoutId={`tile-${item.key}`}
                  data-tile-key={item.key}
                  onClick={() => onOpen(item)}
                  style={{ borderRadius: 16 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="shrink-0 w-[var(--tile-w)] h-[var(--tile-h)] bg-tile px-4 lg:px-[22px] text-left text-[15px] leading-[1.5] cursor-pointer transition-colors active:bg-tile-pressed lg:hover:bg-tile-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <span className="line-clamp-2">{item.question}</span>
                </motion.button>
              )
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
