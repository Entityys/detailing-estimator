import { SERVICE_CATEGORIES, SIZE_TIER_LABELS, ADD_ONS, type SizeTier } from "@/lib/priceBook";
import { Header } from "@/components/Header";

const TIER_ORDER: SizeTier[] = ["SMALL", "MEDIUM", "LARGE", "XL", "MINI_VAN", "CARGO_VAN"];

function money(cents: number | undefined): string {
  if (cents === undefined) return "—";
  return `$${(cents / 100).toFixed(0)}`;
}

export default function PriceBookPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-7">
      <Header active="pricebook" />
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">Price Book</h1>
        <p className="text-sm text-neutral-500">
          What every service costs at every size — this is exactly what a lead's request gets matched against.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-900 border-b border-neutral-800">
              <th className="text-left px-4 py-3 text-neutral-400 font-medium sticky left-0 bg-neutral-900">
                Service
              </th>
              {TIER_ORDER.map((tier) => (
                <th key={tier} className="text-right px-4 py-3 text-neutral-400 font-medium whitespace-nowrap">
                  {SIZE_TIER_LABELS[tier]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SERVICE_CATEGORIES.map((cat, i) => (
              <tr
                key={cat.id}
                className={`border-b border-neutral-900 ${i % 2 === 0 ? "bg-neutral-950" : "bg-neutral-900/40"}`}
              >
                <td className="px-4 py-3 sticky left-0 bg-inherit">
                  <div className="text-neutral-100 font-medium">{cat.name}</div>
                  <div className="text-xs text-neutral-600 max-w-xs truncate" title={cat.description}>
                    {cat.description}
                  </div>
                </td>
                {TIER_ORDER.map((tier) => (
                  <td key={tier} className="text-right px-4 py-3 text-neutral-200 font-mono whitespace-nowrap">
                    {money(cat.pricesCents[tier])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-neutral-100">Add-ons</h2>
        <p className="text-sm text-neutral-500">Flat-fee extras on top of any service, pulled from Flyra.</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-900 border-b border-neutral-800">
              <th className="text-left px-4 py-3 text-neutral-400 font-medium">Add-on</th>
              <th className="text-right px-4 py-3 text-neutral-400 font-medium whitespace-nowrap">Price</th>
            </tr>
          </thead>
          <tbody>
            {ADD_ONS.map((addon, i) => (
              <tr
                key={addon.id}
                className={`border-b border-neutral-900 ${i % 2 === 0 ? "bg-neutral-950" : "bg-neutral-900/40"}`}
              >
                <td className="px-4 py-3 text-neutral-100 font-medium">{addon.name}</td>
                <td className="text-right px-4 py-3 text-neutral-200 font-mono whitespace-nowrap">
                  {money(addon.priceCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-neutral-600">
        To change a price, edit <code className="text-neutral-500">lib/priceBook.ts</code> and re-sync from Flyra's
        price book — ask me to update it any time.
      </p>
    </div>
  );
}
