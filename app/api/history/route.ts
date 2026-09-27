import { NextRequest, NextResponse } from "next/server";
import { listQAs } from "@/lib/qa";

// Paginated questions wall: newest first, `before` is the created_at of the
// last item already shown.
export async function GET(req: NextRequest) {
  const before = req.nextUrl.searchParams.get("before") ?? undefined;
  if (before && Number.isNaN(Date.parse(before))) {
    return NextResponse.json({ error: "Invalid cursor." }, { status: 400 });
  }
  const items = await listQAs({ before, limit: 30 });
  return NextResponse.json({ items });
}
