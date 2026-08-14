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
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Entity Mobile Detailing"
          width={72}
          height={72}
          className="animate-logo-pop rounded-2xl object-cover shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.08)]"
        />
        <div
          className="animate-fade-slide-up text-center mt-5 mb-7"
          style={{ animationDelay: "0.15s" }}
        >
          <h1 className="text-xl font-semibold text-neutral-900">Entity Mobile Detailing</h1>
          <p className="text-sm text-neutral-500 mt-1">Estimator dashboard</p>
        </div>

        <form
          action={login}
          className="animate-fade-slide-up w-full bg-white border border-neutral-200 rounded-xl p-6 space-y-4"
          style={{ animationDelay: "0.25s" }}
        >
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
    </div>
  );
}
