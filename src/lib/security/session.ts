import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/config/env";

export const SESSION_COOKIE = "nv_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export interface Session {
  userId: string;
  issuedAt: number;
  demo: boolean;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSessionToken(userId: string, demo = env.demoMode): string {
  const issuedAt = Date.now();
  const payload = `${userId}.${issuedAt}.${demo ? "1" : "0"}`;
  return `${payload}.${sign(payload, env.sessionSecret)}`;
}

export function verifySessionToken(token: string | undefined | null): Session | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [userId, issuedAtRaw, demoRaw, signature] = parts;
  const payload = `${userId}.${issuedAtRaw}.${demoRaw}`;
  let expected: string;
  try {
    expected = sign(payload, env.sessionSecret);
  } catch {
    return null;
  }
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }
  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt)) return null;
  const ageSeconds = (Date.now() - issuedAt) / 1000;
  if (ageSeconds < 0 || ageSeconds > SESSION_TTL_SECONDS) return null;
  return { userId, issuedAt, demo: demoRaw === "1" };
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function setSessionCookie(userId: string): Promise<Session> {
  const cookieStore = await cookies();
  const token = createSessionToken(userId);
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  const session = verifySessionToken(token);
  if (!session) throw new Error("Failed to establish session");
  return session;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
