"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkPasscode, createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function login(formData: FormData) {
  const passcode = String(formData.get("passcode") || "");
  const next = String(formData.get("next") || "/queue");

  if (!checkPasscode(passcode)) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  const token = createSessionToken();
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(next);
}
