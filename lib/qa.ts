import { randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";

// Server-only access to saved Q&As (qa_history). Rows without a slug or with
// the out-of-syllabus sentinel are never public.

export const OUT_OF_SYLLABUS_MARKER = "__OUT_OF_SYLLABUS__";

export type Source = { guest: string };

export type QA = {
  id: string;
  slug: string;
  question: string;
  short_answer: string;
  long_answer: string;
  sources: Source[];
  created_at: string;
};

const COLUMNS = "id, slug, question, short_answer, long_answer, sources, created_at";

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export function makeSlug(question: string): string {
  const base = question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "");
  const id = randomBytes(4).toString("hex").slice(0, 5);
  return `${base || "q"}-${id}`;
}

export async function listQAs({ before, limit = 30 }: { before?: string; limit?: number } = {}): Promise<QA[]> {
  let q = supabase
    .from("qa_history")
    .select(COLUMNS)
    .not("slug", "is", null)
    .neq("short_answer", OUT_OF_SYLLABUS_MARKER)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (before) q = q.lt("created_at", before);

  const { data, error } = await q;
  if (error) {
    console.error("listQAs error:", error.message);
    return [];
  }
  return (data ?? []) as QA[];
}

export async function getQABySlug(slug: string): Promise<QA | null> {
  const { data, error } = await supabase
    .from("qa_history")
    .select(COLUMNS)
    .eq("slug", slug)
    .neq("short_answer", OUT_OF_SYLLABUS_MARKER)
    .maybeSingle();
  if (error) {
    console.error("getQABySlug error:", error.message);
    return null;
  }
  return data as QA | null;
}
