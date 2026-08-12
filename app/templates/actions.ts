"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function updateTemplate(key: string, formData: FormData) {
  await requireSession();
  const body = String(formData.get("body") || "").trim();
  if (!body) throw new Error("Template body can't be empty");

  await sql`UPDATE message_templates SET body = ${body}, updated_at = now() WHERE key = ${key}`;
  revalidatePath("/templates");
}
