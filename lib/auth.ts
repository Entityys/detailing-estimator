import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "estimator_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not configured");
  return s;
}

export function createSessionToken(): string {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `${expires}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = createHmac("sha256", secret()).update(payload).digest("hex");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return false;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return false;
  return Number(payload) > Date.now();
}

export function checkPasscode(input: string): boolean {
  const configured = (process.env.OWNER_PASSCODE || "").trim();
  if (!configured) return false;
  const inputBuf = Buffer.from(input.trim());
  const configuredBuf = Buffer.from(configured);
  if (inputBuf.length !== configuredBuf.length) return false;
  return timingSafeEqual(inputBuf, configuredBuf);
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

// Server Actions are reachable directly via POST regardless of proxy.ts
// matcher config, so every action that touches data must call this itself
// rather than trusting that proxy already gated the page it's attached to.
export async function requireSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) {
    throw new Error("Unauthorized");
  }
}
