// Pulled directly from Flyra (flyra_list_services) on 2026-08-12.
// Re-sync periodically by re-running that tool and updating this file —
// prices here are the single source of truth for what the app quotes.

export type SizeTier = "SMALL" | "MEDIUM" | "LARGE" | "XL" | "MINI_VAN" | "CARGO_VAN";

export const SIZE_TIER_LABELS: Record<SizeTier, string> = {
  SMALL: "Small",
  MEDIUM: "Medium",
  LARGE: "Large",
  XL: "Extra Large",
  MINI_VAN: "Mini Van",
  CARGO_VAN: "Cargo/Passenger Van",
};

export interface ServiceCategory {
  id: string; // matches this app's internal category key
  flyraCategoryId: string; // Flyra category id, for reference
  name: string;
  description: string;
  // cents per tier; omitted tier = not offered at that size for this category
  pricesCents: Partial<Record<SizeTier, number>>;
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: "standard_full_detail",
    flyraCategoryId: "cat_71c4eaaf-23bb-43cb-8763-a8623fb6b1bd",
    name: "Standard Full Detail",
    description:
      "Interior Blowout, Vacuum, Wipe Down & Clean Windows, Pre Wash, Foam Bath, Contact Wash, Wheels & Tires Cleaned + Dressed, Hydrophobic Sealant, Hand Dry",
    pricesCents: {
      SMALL: 19900,
      MEDIUM: 22900,
      LARGE: 25900,
      XL: 28900,
      MINI_VAN: 30900,
    },
  },
  {
    id: "restore_full_detail",
    flyraCategoryId: "cat_2e40e934-f2af-4935-b635-2d3c601fd15c",
    name: "RESTORE Full Detail (Interior & Exterior)",
    description:
      "Thorough Wipe Down, Blowout & Vacuum, Steam Cleaning, Basic Stain Removal, Streak Free Windows, Deep Clean Cup Holders, Door Panels, Dash & Door Jambs, Trunk & Floor Mat Vacuum/Wash, Pre Wash, Foam Bath, Contact Wash, Clay Bar Decontamination, Wheels & Tires Cleaned + Dressed, 3 Month Hydrophobic Wax, Hand Dry",
    pricesCents: {
      SMALL: 29900,
      MEDIUM: 32500,
      LARGE: 37500,
      XL: 39900,
      MINI_VAN: 45000,
    },
  },
  {
    id: "standard_exterior_detail",
    flyraCategoryId: "cat_b977dbd5-d63c-4e58-8c44-d486fc00f3b3",
    name: "Standard Exterior Detail",
    description:
      "Pre Wash, Foam Bath, Contact Wash, Wheels & Tires Cleaned + Dressed, Hydrophobic Sealant, Hand Dry",
    pricesCents: {
      SMALL: 8900,
      MEDIUM: 9900,
      LARGE: 10900,
      XL: 11900,
      MINI_VAN: 12900,
    },
  },
  {
    id: "restore_exterior_detail",
    flyraCategoryId: "cat_3a8f3fe4-028d-4e0d-b0ba-783c97e329dd",
    name: "RESTORE Exterior Detail",
    description:
      "Pre Wash, Foam Bath, Contact Wash, Clay Bar Decontamination, Wheels & Tires Cleaned + Dressed, 3 Month Hydrophobic Wax, Hand Dry",
    pricesCents: {
      SMALL: 9900,
      MEDIUM: 11500,
      LARGE: 13000,
      XL: 14500,
      MINI_VAN: 16000,
      CARGO_VAN: 27500,
    },
  },
  {
    id: "standard_interior_detail",
    flyraCategoryId: "cat_dde8bcd7-c113-4f1d-a525-7b8ab8b8a79c",
    name: "Standard Interior Detail",
    description:
      "Vacuum, Forced air blow out & Wipe Down of all surfaces, Windows cleaned inside",
    pricesCents: {
      SMALL: 14900,
      MEDIUM: 17900,
      LARGE: 19900,
      XL: 21900,
      MINI_VAN: 23900,
    },
  },
  {
    id: "restore_interior_detail",
    flyraCategoryId: "cat_9602cbae-d9be-4240-b9e9-5101fa9252ec",
    name: "RESTORE Interior Detail",
    description:
      "Thorough Wipe Down, Blowout & Vacuum, Steam Cleaning, Basic Stain Removal, Streak Free Windows, Deep Clean Cup Holders, Door Panels, Dash & Door Jambs, Trunk & Floor Mat Vacuum/Wash",
    pricesCents: {
      SMALL: 22900,
      MEDIUM: 25000,
      LARGE: 27500,
      XL: 29900,
      MINI_VAN: 32500,
    },
  },
  {
    id: "maintenance_detail",
    flyraCategoryId: "cat_34cff27e-98ee-4392-a890-0ea960d3caa7",
    name: "Maintenance Detail",
    description:
      "Pre Wash, Foam Bath, 2 Bucket Hand Wash, Door Jambs, Wheels & Tires Cleaned + Shine, Hydrophobic Sealant, Hand Dry, Full Interior Blowout, Vacuum, Wipe Down & Clean Windows",
    pricesCents: {
      SMALL: 16900,
      MEDIUM: 18900,
      LARGE: 20900,
      XL: 22900,
      MINI_VAN: 24900,
    },
  },
  {
    id: "paint_correction_level_1",
    flyraCategoryId: "cat_18c4a9e4-c59a-45fb-99a8-55ce96989e23",
    name: "Level 1 Paint Correction",
    description: "Removal of light swirl marks/minor scratches; restores clarity and shine.",
    pricesCents: {
      SMALL: 25000,
      MEDIUM: 35000,
      LARGE: 45000,
    },
  },
  {
    id: "paint_correction_level_2",
    flyraCategoryId: "cat_18c4a9e4-c59a-45fb-99a8-55ce96989e23",
    name: "Level 2 Paint Correction",
    description: "Removal of moderate-to-severe swirls/scratches/oxidation.",
    pricesCents: {
      SMALL: 50000,
      MEDIUM: 65000,
      LARGE: 80000,
    },
  },
  {
    id: "ceramic_coating_5y",
    flyraCategoryId: "cat_4551f55e-664e-4e1d-a353-126e79f77143",
    name: "5y Ceramic Coating",
    description:
      "Pre Wash, Foam Bath, Contact Wash, Wheels & Tires Cleaned + Dressed, Iron Remover & Clay Bar Decontamination, Hand Dry, Level 1 Paint Correction, Coating Application",
    pricesCents: {
      SMALL: 89900,
      MEDIUM: 99900,
      LARGE: 119900,
    },
  },
];

export function getCategory(id: string): ServiceCategory | undefined {
  return SERVICE_CATEGORIES.find((c) => c.id === id);
}

export function getPriceCents(categoryId: string, tier: SizeTier): number | undefined {
  return getCategory(categoryId)?.pricesCents[tier];
}

// Keyword matching from free-text lead form answers ("what service are you
// interested in?") to a category. Order matters — more specific phrases first.
// Returns null when the phrase is genuinely ambiguous between Standard/RESTORE.
export function matchServiceCategory(rawText: string | null | undefined): {
  categoryId: string | null;
  ambiguous: boolean;
  reason: string;
} {
  if (!rawText) return { categoryId: null, ambiguous: true, reason: "No service specified on lead" };
  const t = rawText.toLowerCase().replace(/[_\-]/g, " ");

  const hasRestore = /restore/.test(t);
  const hasStandard = /standard/.test(t);
  const hasFull = /full/.test(t) || (/interior/.test(t) && /exterior/.test(t));
  const hasInteriorOnly = /interior/.test(t) && !/exterior/.test(t);
  const hasExteriorOnly = /exterior/.test(t) && !/interior/.test(t);
  const hasMaintenance = /maintenance/.test(t);
  const hasPaintCorrection = /paint correction/.test(t);
  const hasLevel2 = /level\s*2|level ii/.test(t);
  const hasCeramic = /ceramic/.test(t);

  if (hasCeramic) return { categoryId: "ceramic_coating_5y", ambiguous: false, reason: "Matched 'ceramic'" };
  if (hasPaintCorrection) {
    return {
      categoryId: hasLevel2 ? "paint_correction_level_2" : "paint_correction_level_1",
      ambiguous: false,
      reason: "Matched 'paint correction'",
    };
  }
  if (hasMaintenance) return { categoryId: "maintenance_detail", ambiguous: false, reason: "Matched 'maintenance'" };

  if (hasFull) {
    if (hasRestore) return { categoryId: "restore_full_detail", ambiguous: false, reason: "Matched 'restore' + full" };
    if (hasStandard) return { categoryId: "standard_full_detail", ambiguous: false, reason: "Matched 'standard' + full" };
    // "full detail" with no standard/restore qualifier — genuinely ambiguous
    return { categoryId: null, ambiguous: true, reason: "Says 'full detail' but doesn't specify Standard vs RESTORE" };
  }
  if (hasInteriorOnly) {
    if (hasRestore) return { categoryId: "restore_interior_detail", ambiguous: false, reason: "Matched 'restore' + interior" };
    if (hasStandard) return { categoryId: "standard_interior_detail", ambiguous: false, reason: "Matched 'standard' + interior" };
    return { categoryId: null, ambiguous: true, reason: "Says 'interior detail' but doesn't specify Standard vs RESTORE" };
  }
  if (hasExteriorOnly) {
    if (hasRestore) return { categoryId: "restore_exterior_detail", ambiguous: false, reason: "Matched 'restore' + exterior" };
    if (hasStandard) return { categoryId: "standard_exterior_detail", ambiguous: false, reason: "Matched 'standard' + exterior" };
    return { categoryId: null, ambiguous: true, reason: "Says 'exterior detail' but doesn't specify Standard vs RESTORE" };
  }

  return { categoryId: null, ambiguous: true, reason: `Couldn't match service text: "${rawText}"` };
}
