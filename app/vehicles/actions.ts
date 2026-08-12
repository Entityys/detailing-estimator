"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import type { SizeTier } from "@/lib/priceBook";

export async function addVehicle(formData: FormData) {
  await requireSession();
  const make = String(formData.get("make") || "").trim();
  const model = String(formData.get("model") || "").trim();
  const tier = String(formData.get("tier") || "") as SizeTier;
  const notes = String(formData.get("notes") || "").trim();

  if (!make || !model || !tier) throw new Error("Make, model, and tier are required");

  await sql`INSERT INTO vehicle_size_map (make, model, tier, notes) VALUES (${make}, ${model}, ${tier}, ${notes || null})`;
  revalidatePath("/vehicles");
}

export async function deleteVehicle(id: number, _formData: FormData) {
  await requireSession();
  await sql`DELETE FROM vehicle_size_map WHERE id = ${id}`;
  revalidatePath("/vehicles");
}
