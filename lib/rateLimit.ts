import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

// Per-IP and global limits backed by the rate_events table
// (supabase/004_create_rate_events.sql). Fails open if the table is
// unreachable: the request will fail later anyway if Supabase is down.

type Kind = "ask" | "feedback";

type Result = { ok: true } | { ok: false; reason: string };

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const LIMITS: Record<Kind, { perIpPerHour: number; globalPerDay: number | null }> = {
  ask: {
    perIpPerHour: Number(process.env.ASK_LIMIT_PER_HOUR ?? 10),
    globalPerDay: Number(process.env.ASK_DAILY_CAP ?? 500),
  },
  feedback: { perIpPerHour: 30, globalPerDay: null },
};

function clientIpHash(req: NextRequest): string {
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown";
  const salt = process.env.RATE_LIMIT_SALT ?? "asktgp";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export async function checkRateLimit(
  supabase: SupabaseClient,
  req: NextRequest,
  kind: Kind
): Promise<Result> {
  const { perIpPerHour, globalPerDay } = LIMITS[kind];
  const ipHash = clientIpHash(req);
  const now = Date.now();

  try {
    const [perIp, global] = await Promise.all([
      supabase
        .from("rate_events")
        .select("id", { count: "exact", head: true })
        .eq("kind", kind)
        .eq("ip_hash", ipHash)
        .gte("created_at", new Date(now - HOUR).toISOString()),
      globalPerDay === null
        ? Promise.resolve({ count: 0, error: null })
        : supabase
            .from("rate_events")
            .select("id", { count: "exact", head: true })
            .eq("kind", kind)
            .gte("created_at", new Date(now - DAY).toISOString()),
    ]);

    if (perIp.error || global.error) {
      console.error("Rate limit check failed:", perIp.error?.message ?? global.error?.message);
      return { ok: true };
    }

    if ((perIp.count ?? 0) >= perIpPerHour) {
      return { ok: false, reason: "You've asked a lot in the last hour. Please try again a little later." };
    }
    if (globalPerDay !== null && (global.count ?? 0) >= globalPerDay) {
      return { ok: false, reason: "AskTGP has answered all it can for today. Please come back tomorrow." };
    }

    const { error } = await supabase.from("rate_events").insert({ kind, ip_hash: ipHash });
    if (error) console.error("Rate event insert failed:", error.message);
    return { ok: true };
  } catch (err) {
    console.error("Rate limit exception:", err);
    return { ok: true };
  }
}
