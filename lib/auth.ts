// Isomorphic session-token helpers. Uses the Web Crypto API (available in both
// the Edge middleware runtime and the Node API routes on Node 18+), so the same
// code signs tokens in API routes and verifies them in middleware.

export const SESSION_COOKIE = "session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  username: string;
  role: string; // 'admin' | 'agent'
  exp: number; // epoch ms
}

function getSecret(): string {
  return process.env.AUTH_SECRET || "dev-insecure-secret-change-me";
}

const encoder = new TextEncoder();

function toB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = str.length % 4 ? 4 - (str.length % 4) : 0;
  const bin = atob(str + "=".repeat(pad));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Copy into a freshly-allocated ArrayBuffer so the value satisfies the Web
// Crypto BufferSource type across TS lib versions.
function buf(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer;
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    buf(encoder.encode(getSecret())),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

// Create a signed token for a user, valid for SESSION_TTL_MS.
export async function signToken(
  username: string,
  role = "agent"
): Promise<string> {
  const payload: SessionPayload = {
    username,
    role,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const p = toB64url(encoder.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(),
    buf(encoder.encode(p))
  );
  return `${p}.${toB64url(new Uint8Array(sig))}`;
}

// Verify a token's signature and expiry. Returns the payload, or null if invalid.
export async function verifyToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [p, s] = token.split(".");
  if (!p || !s) return null;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      buf(fromB64url(s)),
      buf(encoder.encode(p))
    );
    if (!ok) return null;
    const payload = JSON.parse(
      new TextDecoder().decode(fromB64url(p))
    ) as SessionPayload;
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_TTL_MS / 1000;
