import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RATINGS = new Set(["makes_sense", "doesnt_make_sense"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const { rating, qa_history_id } = await req.json().catch(() => ({}));

  if (typeof rating !== "string" || !RATINGS.has(rating) ||
      typeof qa_history_id !== "string" || !UUID.test(qa_history_id)) {
    return NextResponse.json({ error: "Invalid feedback." }, { status: 400 });
  }

  const limit = await checkRateLimit(supabase, req, "feedback");
  if (!limit.ok) {
    return NextResponse.json({ error: limit.reason }, { status: 429 });
  }

  // Copy the Q&A text from our own record rather than trusting the client.
  const { data: qa, error: qaErr } = await supabase
    .from("qa_history")
    .select("question, short_answer, long_answer")
    .eq("id", qa_history_id)
    .maybeSingle();

  if (qaErr) {
    console.error("Feedback lookup error:", qaErr);
    return NextResponse.json({ error: "Failed to save feedback." }, { status: 500 });
  }
  if (!qa) {
    return NextResponse.json({ error: "Invalid feedback." }, { status: 400 });
  }

  const { error } = await supabase.from("feedback").insert({ ...qa, rating, qa_history_id });

  if (error) {
    console.error("Feedback error:", error);
    return NextResponse.json({ error: "Failed to save feedback." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
