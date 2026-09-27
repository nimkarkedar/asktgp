import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Keep-alive endpoint — called daily by Vercel Cron (and an external uptime
// monitor) to prevent Supabase free-tier from pausing the project due to
// inactivity. Also prunes old rate-limit rows.
export async function GET() {
  const { error } = await supabase
    .from("qa_history")
    .select("id")
    .limit(1);

  if (error) {
    console.error("Ping failed:", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const { error: pruneErr } = await supabase
    .from("rate_events")
    .delete()
    .lt("created_at", twoDaysAgo);
  if (pruneErr) console.error("rate_events prune failed:", pruneErr.message);

  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
