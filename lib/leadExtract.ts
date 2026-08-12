// Shape of a lead as returned by the flyra_get_lead MCP tool. Only the
// fields this app actually reads — see the real payload logged from
// flyra_get_lead during development for the full shape.
export interface FlyraLead {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  data_json?: Record<string, unknown> | null;
}

// Meta lead forms key their answers like "05. What car are you looking to
// service?" while the native Flyra webform uses plain keys like "make/model".
// Both live in lead.data_json — scan by keyword rather than an exact key.
function findByKeyword(data: Record<string, unknown>, keywords: string[]): string | null {
  for (const [key, value] of Object.entries(data)) {
    const k = key.toLowerCase();
    if (keywords.some((kw) => k.includes(kw)) && typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export interface ExtractedLeadInfo {
  customerName: string;
  phone: string | null;
  city: string | null;
  vehicleText: string | null;
  serviceText: string | null;
}

export function extractLeadInfo(lead: FlyraLead): ExtractedLeadInfo {
  const data = (lead.data_json || {}) as Record<string, unknown>;

  const customerName =
    [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim() ||
    findByKeyword(data, ["full name", "name"]) ||
    "Unknown";

  const vehicleText =
    findByKeyword(data, ["car", "vehicle", "make/model", "make", "model"]) || null;

  const serviceText = findByKeyword(data, ["service"]) || null;

  const city = lead.city?.trim() || findByKeyword(data, ["city"]) || null;

  const phone = lead.phone || findByKeyword(data, ["phone"]) || null;

  return { customerName, phone, city, vehicleText, serviceText };
}
