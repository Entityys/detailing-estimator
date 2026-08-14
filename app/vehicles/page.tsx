import { sql } from "@/lib/db";
import { SIZE_TIER_LABELS, type SizeTier } from "@/lib/priceBook";
import { classifyVehicle } from "@/lib/classify";
import { Header } from "@/components/Header";
import { addVehicle, deleteVehicle } from "./actions";

export const dynamic = "force-dynamic";

interface VehicleRow {
  id: number;
  make: string;
  model: string;
  tier: SizeTier;
  notes: string | null;
}

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ check?: string }>;
}) {
  const params = await searchParams;
  const checkText = params.check?.trim() || "";
  // Drop a leading model-year token (e.g. "2019 Nissan Altima" -> "Nissan Altima")
  // so the quick-save suggestion doesn't put the year in the make field.
  const checkWords = checkText.split(/\s+/).filter(Boolean);
  const checkWordsNoYear =
    checkWords.length > 1 && /^(19|20)\d{2}$/.test(checkWords[0]) ? checkWords.slice(1) : checkWords;
  const suggestedMake = checkWordsNoYear.slice(0, -1).join(" ") || checkWordsNoYear[0] || "";
  const suggestedModel = checkWordsNoYear.slice(-1).join(" ");

  const [vehiclesRaw, result] = await Promise.all([
    sql`SELECT * FROM vehicle_size_map ORDER BY tier, make, model`,
    checkText ? classifyVehicle(checkText) : Promise.resolve(null),
  ]);
  const vehicles = vehiclesRaw as VehicleRow[];

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-7">
      <Header active="vehicles" />
      <h1 className="text-xl font-semibold text-neutral-900">Vehicle Size List</h1>

      <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-800">Check a vehicle</h2>
          <p className="text-xs text-neutral-500">
            Type any make/model (or paste what a lead wrote) to see what tier it lands in.
          </p>
        </div>
        <form action="/vehicles" method="GET" className="flex gap-2">
          <input
            name="check"
            defaultValue={checkText}
            placeholder="e.g. 2021 Toyota Highlander"
            className="flex-1 bg-neutral-200 border border-neutral-300 rounded px-3 py-2 text-sm text-neutral-900"
          />
          <button
            type="submit"
            className="text-sm bg-accent hover:bg-accent-dark text-white px-4 py-2 rounded font-medium"
          >
            Check
          </button>
        </form>

        {result && (
          <div
            className={`rounded-lg border p-3 ${
              result.confidence === "CONFIDENT" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  result.confidence === "CONFIDENT" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {result.confidence === "CONFIDENT" ? "Confident match" : "Not on your list yet"}
              </span>
              <span className="text-neutral-900 font-semibold">
                {result.tier ? SIZE_TIER_LABELS[result.tier] : "No tier determined"}
              </span>
            </div>
            <p className="text-xs text-neutral-600 mt-1">{result.reason}</p>

            {result.confidence === "AMBIGUOUS" && (
              <form action={addVehicle} className="flex flex-wrap items-end gap-2 mt-3 pt-3 border-t border-neutral-200">
                <input type="hidden" name="make" value={suggestedMake} />
                <input
                  name="model"
                  placeholder="Model to save"
                  defaultValue={suggestedModel}
                  className="bg-neutral-200 border border-neutral-300 rounded px-2 py-1.5 text-xs text-neutral-900 flex-1 min-w-[120px]"
                />
                <select
                  name="tier"
                  required
                  defaultValue={result.tier ?? ""}
                  className="bg-neutral-200 border border-neutral-300 rounded px-2 py-1.5 text-xs text-neutral-900"
                >
                  <option value="" disabled>
                    Size tier…
                  </option>
                  {Object.entries(SIZE_TIER_LABELS).map(([tier, label]) => (
                    <option key={tier} value={tier}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="text-xs bg-accent hover:bg-accent-dark text-white px-3 py-1.5 rounded font-medium"
                >
                  Save to list
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <p className="text-sm text-neutral-500">
        This is what decides the tier a vehicle gets quoted at. Add anything that keeps showing up
        as &ldquo;needs review&rdquo; in the pipeline.
      </p>

      <form
        action={addVehicle}
        className="grid grid-cols-2 gap-3 bg-white border border-neutral-200 rounded-lg p-4"
      >
        <input
          name="make"
          placeholder="Make (e.g. Toyota)"
          required
          className="bg-neutral-200 border border-neutral-300 rounded px-2 py-1.5 text-sm text-neutral-900"
        />
        <input
          name="model"
          placeholder="Model (e.g. Highlander)"
          required
          className="bg-neutral-200 border border-neutral-300 rounded px-2 py-1.5 text-sm text-neutral-900"
        />
        <select
          name="tier"
          required
          defaultValue=""
          className="bg-neutral-200 border border-neutral-300 rounded px-2 py-1.5 text-sm text-neutral-900"
        >
          <option value="" disabled>
            Size tier…
          </option>
          {Object.entries(SIZE_TIER_LABELS).map(([tier, label]) => (
            <option key={tier} value={tier}>
              {label}
            </option>
          ))}
        </select>
        <input
          name="notes"
          placeholder="Notes (optional)"
          className="bg-neutral-200 border border-neutral-300 rounded px-2 py-1.5 text-sm text-neutral-900"
        />
        <button
          type="submit"
          className="col-span-2 text-sm bg-accent hover:bg-accent-dark text-white py-1.5 rounded font-medium"
        >
          Add vehicle
        </button>
      </form>

      <div className="space-y-1">
        {vehicles.map((v) => (
          <div
            key={v.id}
            className="flex items-center justify-between bg-white border border-neutral-200 rounded px-3 py-2 text-sm"
          >
            <div>
              <span className="text-neutral-900">
                {v.make} {v.model}
              </span>
              <span className="text-neutral-500"> — {SIZE_TIER_LABELS[v.tier]}</span>
              {v.notes && <span className="text-neutral-400 text-xs"> ({v.notes})</span>}
            </div>
            <form action={deleteVehicle.bind(null, v.id)}>
              <button type="submit" className="text-neutral-400 hover:text-brand text-xs">
                Remove
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
