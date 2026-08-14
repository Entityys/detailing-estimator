import { login } from "./actions";
import { SubmitButton } from "./SubmitButton";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next || "/home";
  const hasError = params.error === "1";

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <form
        action={login}
        className="w-full max-w-sm bg-white border border-neutral-200 rounded-xl p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Entity Mobile Detailing" width={48} height={48} className="rounded-lg object-cover" />
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">Entity Mobile Detailing</h1>
            <p className="text-sm text-neutral-600">Estimator dashboard</p>
          </div>
        </div>
        <input type="hidden" name="next" value={next} />
        <div>
          <label className="block text-sm text-neutral-700 mb-1" htmlFor="passcode">
            Passcode
          </label>
          <input
            id="passcode"
            name="passcode"
            type="password"
            autoComplete="off"
            autoFocus
            required
            className="w-full rounded-md bg-neutral-200 border border-neutral-300 px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        {hasError && <p className="text-sm text-brand">Wrong passcode — try again.</p>}
        <SubmitButton />
      </form>
    </div>
  );
}
