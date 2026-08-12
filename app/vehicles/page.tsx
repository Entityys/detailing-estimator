import { sql } from "@/lib/db";
import { SIZE_TIER_LABELS, type SizeTier } from "@/lib/priceBook";
import { addVehicle, deleteVehicle } from "./actions";

export const dynamic = "force-dynamic";

interface VehicleRow {
  id: number;
  make: string;
  model: string;
  tier: SizeTier;
  notes: string | null;
}

export default async function VehiclesPage() {
  const vehicles = (await sql`SELECT * FROM vehicle_size_map ORDER BY tier, make, model`) as VehicleRow[];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-neutral-100">Vehicle Size List</h1>
        <a href="/queue" className="text-sm text-neutral-400 hover:text-neutral-200">
          Back to queue
        </a>
      </div>
      <p className="text-sm text-neutral-500">
        This is what decides the tier a vehicle gets quoted at. Add anything that keeps showing up
        as &ldquo;needs review&rdquo; in the queue.
      </p>

      <form
        action={addVehicle}
        className="grid grid-cols-2 gap-3 bg-neutral-900 border border-neutral-800 rounded-lg p-4"
      >
        <input
          name="make"
          placeholder="Make (e.g. Toyota)"
          required
          className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-sm text-neutral-100"
        />
        <input
          name="model"
          placeholder="Model (e.g. Highlander)"
          required
          className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-sm text-neutral-100"
        />
        <select
          name="tier"
          required
          defaultValue=""
          className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-sm text-neutral-100"
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
          className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-sm text-neutral-100"
        />
        <button
          type="submit"
          className="col-span-2 text-sm bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded font-medium"
        >
          Add vehicle
        </button>
      </form>

      <div className="space-y-1">
        {vehicles.map((v) => (
          <div
            key={v.id}
            className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm"
          >
            <div>
              <span className="text-neutral-100">
                {v.make} {v.model}
              </span>
              <span className="text-neutral-500"> — {SIZE_TIER_LABELS[v.tier]}</span>
              {v.notes && <span className="text-neutral-600 text-xs"> ({v.notes})</span>}
            </div>
            <form action={deleteVehicle.bind(null, v.id)}>
              <button type="submit" className="text-neutral-600 hover:text-red-400 text-xs">
                Remove
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
