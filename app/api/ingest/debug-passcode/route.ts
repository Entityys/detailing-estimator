import { NextRequest, NextResponse } from "next/server";
import { checkIngestAuth } from "@/lib/ingestAuth";
import { checkPasscode } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Temporary diagnostic — never returns the configured passcode itself, only
// its length and whether a candidate matches. Delete once the login issue
// is resolved.
export async function GET(req: NextRequest) {
  const authError = checkIngestAuth(req);
  if (authError) return authError;

  const candidate = req.nextUrl.searchParams.get("candidate") || "";
  const configured = process.env.OWNER_PASSCODE || "";

  return NextResponse.json({
    configuredLength: configured.length,
    configuredCharCodes: [...configured].map((c) => c.charCodeAt(0)),
    candidateLength: candidate.length,
    matches: checkPasscode(candidate),
  });
}
