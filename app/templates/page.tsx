import { sql } from "@/lib/db";
import { TEMPLATE_DEFS } from "@/lib/templates";
import { Header } from "@/components/Header";
import { updateTemplate } from "./actions";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const rows = (await sql`SELECT key, body FROM message_templates`) as { key: string; body: string }[];
  const bodyByKey = new Map(rows.map((r) => [r.key, r.body]));

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <Header active="templates" />
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">Message Templates</h1>
        <p className="text-sm text-neutral-500">
          What actually goes out by text. Edit the wording any time — changes apply to the very next send.
        </p>
      </div>

      <div className="space-y-4">
        {TEMPLATE_DEFS.map((def) => (
          <div key={def.key} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-neutral-200">{def.label}</h2>
              <p className="text-xs text-neutral-500">{def.description}</p>
            </div>
            <form action={updateTemplate.bind(null, def.key)} className="space-y-2">
              <textarea
                name="body"
                defaultValue={bodyByKey.get(def.key) ?? ""}
                rows={3}
                className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100 resize-y"
              />
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {def.placeholders.map((p) => (
                    <span
                      key={p}
                      className="text-[10px] font-mono bg-neutral-800 text-neutral-400 rounded px-1.5 py-0.5"
                    >
                      {`{{${p}}}`}
                    </span>
                  ))}
                </div>
                <button
                  type="submit"
                  className="text-xs bg-brand hover:bg-brand-dark text-white px-3 py-1.5 rounded font-medium"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
