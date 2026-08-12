import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next || "/queue";
  const hasError = params.error === "1";

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <form
        action={login}
        className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4"
      >
        <div>
          <h1 className="text-lg font-semibold text-neutral-100">Entity Mobile Detailing</h1>
          <p className="text-sm text-neutral-400">Estimator dashboard</p>
        </div>
        <input type="hidden" name="next" value={next} />
        <div>
          <label className="block text-sm text-neutral-300 mb-1" htmlFor="passcode">
            Passcode
          </label>
          <input
            id="passcode"
            name="passcode"
            type="password"
            autoFocus
            required
            className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {hasError && <p className="text-sm text-red-400">Wrong passcode — try again.</p>}
        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 hover:bg-blue-500 text-white py-2 font-medium transition"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
