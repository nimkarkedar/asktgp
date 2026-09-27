import type { QA } from "@/lib/qa";

export type ItemState = "answered" | "pending" | "oos" | "needsContext" | "error";

// A tile on the wall. `key` is stable for the tile's lifetime (a new question
// gets a temporary key before it has an id/slug), so the shared-element
// layoutId never changes underneath an animation.
export type WallItem = QA & { key: string; state: ItemState; message?: string };

export function toWallItem(qa: QA): WallItem {
  return { ...qa, sources: qa.sources ?? [], key: qa.id, state: "answered" };
}
