import { NextRequest, NextResponse } from "next/server";
import { checkIngestAuth } from "@/lib/ingestAuth";
import { renderTemplate } from "@/lib/templates";

export const dynamic = "force-dynamic";

// Renders the "estimate sent" message from the owner-editable template, so
// the automation doesn't have the wording hardcoded in its own instructions.
export async function POST(req: NextRequest) {
  const authError = checkIngestAuth(req);
  if (authError) return authError;

  const { customerName, link } = await req.json();
  if (!customerName || !link) {
    return NextResponse.json({ error: "customerName and link required" }, { status: 400 });
  }

  const firstName = String(customerName).split(" ")[0];
  const body = await renderTemplate("estimate_sent", { firstName, link: String(link) });

  return NextResponse.json({ body });
}
