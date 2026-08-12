import { sql } from "./db";

export interface TemplateDef {
  key: string;
  label: string;
  description: string;
  placeholders: string[];
}

export const TEMPLATE_DEFS: TemplateDef[] = [
  {
    key: "missing_info",
    label: "Ask for vehicle info",
    description: "Sent to a lead automatically when they didn't say what they drive.",
    placeholders: ["firstName"],
  },
  {
    key: "owner_notification",
    label: "Text me when a lead needs review",
    description: "Sent to your own phone when a new lead lands in the pipeline.",
    placeholders: ["customerName", "vehicle", "price"],
  },
  {
    key: "estimate_sent",
    label: "Estimate sent to customer",
    description: "Sent to the customer the moment you approve an estimate.",
    placeholders: ["firstName", "link"],
  },
];

function interpolate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key) => (key in vars ? vars[key] : match));
}

export async function renderTemplate(key: string, vars: Record<string, string>): Promise<string> {
  const rows = (await sql`SELECT body FROM message_templates WHERE key = ${key}`) as { body: string }[];
  const def = TEMPLATE_DEFS.find((t) => t.key === key);
  const body = rows[0]?.body ?? def?.description ?? "";
  return interpolate(body, vars);
}
