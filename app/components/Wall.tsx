"use client";

import { useSyncExternalStore } from "react";
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

// Seconds for one row to drift by its own width. Scales with tiles per row
// so every screen size moves at a similar, slow speed.
const SECONDS_PER_TILE = 12;

const TILE = "shrink-0 w-[var(--tile-w)] h-[var(--tile-h)]";

export default function Wall({
  items,
  paused,
  onOpen,
}: {
  items: WallItem[];
  paused: boolean;
  onOpen: (item: WallItem) => void;
}) {
  const perRow = useTilesPerRow();
  // Pad with empty tiles: at least MIN_ROWS rows, and never a ragged last row,
  // so the wall reads as a wall even before many questions exist.
  const total = Math.max(MIN_ROWS * perRow, Math.ceil(items.length / perRow) * perRow);
  const cells: (WallItem | null)[] = [...items, ...Array<null>(total - items.length).fill(null)];
  const rows: (WallItem | null)[][] = [];
  for (let i = 0; i < cells.length; i += perRow) rows.push(cells.slice(i, i + perRow));

  const duration = perRow * SECONDS_PER_TILE;

  // One set of a row's tiles. The marquee renders it three times back to back
  // (two can leave a gap on phones, where a set is narrower than the screen)
  // and slides left by exactly one set, so the loop is seamless. Only the first
  // copy is exposed to keyboards / screen readers.
  function renderSet(row: (WallItem | null)[], copy: boolean) {
    return (
      <div className="flex shrink-0 gap-[var(--tile-gap)] pr-[var(--tile-gap)]" aria-hidden={copy || undefined}>
        {row.map((item, c) =>
          item === null ? (
            <div key={`empty-${c}`} aria-hidden className={`${TILE} rounded-2xl bg-tile`} />
          ) : (
            <button
              key={item.key}
              type="button"
              data-tile-key={copy ? undefined : item.key}
              tabIndex={copy ? -1 : undefined}
              onClick={() => onOpen(item)}
              className={`${TILE} rounded-2xl bg-tile px-4 lg:px-[22px] text-left t-body cursor-pointer transition-colors active:bg-tile-pressed lg:hover:bg-tile-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink`}
            >
              <span className="line-clamp-2">{item.question}</span>
            </button>
          )
        )}
      </div>
    );
  }

  return (
    <section
      aria-label="Questions asked by others"
      data-paused={paused || undefined}
      className="wall w-full overflow-hidden pb-16"
    >
      <div className="flex flex-col gap-[var(--tile-gap)] lg:gap-7">
        {rows.map((row, r) => (
          <div key={r} className="marquee-row">
            <div
              className="marquee flex w-max"
              style={{
                animationDuration: `${duration}s`,
                // Odd rows start half a tile along, keeping the brick offset.
                animationDelay: r % 2 === 1 ? `-${duration / (2 * perRow)}s` : "0s",
              }}
            >
              {renderSet(row, false)}
              {renderSet(row, true)}
              {renderSet(row, true)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
