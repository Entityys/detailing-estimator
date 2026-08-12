import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

// Auth for the /api/ingest/* routes the scheduled automation calls. Separate
// from the owner's dashboard session (SESSION_SECRET/OWNER_PASSCODE) — this
// is a machine-to-machine secret, not something a human types in.
export function checkIngestAuth(req: NextRequest): NextResponse | null {
  const expected = process.env.INGEST_SECRET;
  if (!expected) return NextResponse.json({ error: "INGEST_SECRET not configured" }, { status: 500 });

  const auth = req.headers.get("authorization") || "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  const ok = providedBuf.length === expectedBuf.length && timingSafeEqual(providedBuf, expectedBuf);

  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return null;
}
