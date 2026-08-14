"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-accent hover:bg-accent-dark disabled:opacity-60 disabled:cursor-not-allowed text-white py-2 font-medium transition"
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}
