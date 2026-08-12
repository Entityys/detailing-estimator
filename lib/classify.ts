import { sql } from "./db";
import type { SizeTier } from "./priceBook";

export interface VehicleMapEntry {
  id: number;
  make: string;
  model: string;
  tier: SizeTier;
  notes: string | null;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Cheap Levenshtein distance for tolerating typos like "couper" vs "cooper".
function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function wordCloseMatch(needle: string, haystackWords: string[]): boolean {
  return haystackWords.some((w) => {
    if (w === needle) return true;
    if (Math.min(w.length, needle.length) < 4) return false; // too short to fuzzy-match safely
    return levenshtein(w, needle) <= 1;
  });
}

export interface ClassifyResult {
  tier: SizeTier | null;
  confidence: "CONFIDENT" | "AMBIGUOUS";
  reason: string;
  matchedEntry?: VehicleMapEntry;
}

export async function classifyVehicle(rawText: string | null | undefined): Promise<ClassifyResult> {
  if (!rawText || !rawText.trim()) {
    return { tier: null, confidence: "AMBIGUOUS", reason: "No vehicle info on lead" };
  }

  const entries = (await sql`SELECT id, make, model, tier, notes FROM vehicle_size_map`) as VehicleMapEntry[];
  const inputWords = normalize(rawText).split(" ");

  // Special case: bare "ram" without a trim number is a real pricing fork
  // (1500 = Large, 2500/3500 = XL) — always send to review rather than guess.
  const hasRam = inputWords.includes("ram") || inputWords.includes("dodge");
  const hasTrimNumber = inputWords.some((w) => ["1500", "2500", "3500"].includes(w));
  if (hasRam && !hasTrimNumber) {
    return {
      tier: "LARGE",
      confidence: "AMBIGUOUS",
      reason:
        "Mentions a Ram/Dodge truck but no trim number (1500 vs 2500/3500) — defaulting to Large (1500), confirm before sending",
    };
  }

  let best: { entry: VehicleMapEntry; score: number } | null = null;

  for (const entry of entries) {
    const modelNorm = normalize(entry.model);
    const makeNorm = normalize(entry.make);
    if (entry.model === "*") {
      // make-only match (e.g. Ferrari — any model counts)
      if (inputWords.includes(makeNorm)) {
        const score = 1;
        if (!best || score > best.score) best = { entry, score };
      }
      continue;
    }

    const modelWords = modelNorm.split(" ");
    const allModelWordsPresent = modelWords.every((mw) => wordCloseMatch(mw, inputWords));
    if (allModelWordsPresent) {
      // Prefer matches where the make also appears (more specific / more confident)
      const makePresent = makeNorm.split(" ").every((mkw) => wordCloseMatch(mkw, inputWords));
      const score = modelWords.length * 10 + (makePresent ? 5 : 0);
      if (!best || score > best.score) best = { entry, score };
    }
  }

  if (best) {
    return {
      tier: best.entry.tier,
      confidence: "CONFIDENT",
      reason: `Matched "${best.entry.make} ${best.entry.model}" in your size list`,
      matchedEntry: best.entry,
    };
  }

  return {
    tier: null,
    confidence: "AMBIGUOUS",
    reason: `"${rawText}" doesn't match anything in your size list — needs a manual size call (and maybe an addition to the list)`,
  };
}
