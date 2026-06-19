// Signature et vérification de session TREKKA (HMAC-SHA256, Web Crypto).
// Aucune dépendance, aucun accès base, pas de next/headers :
// utilisable en middleware (edge), routes API et composants serveur.

export const SESSION_COOKIE = "trekka_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

const ENC = new TextEncoder();
const DEC = new TextDecoder();

export interface SessionPayload {
  sub: string; // id utilisateur
  nom: string;
  role: string;
  email: string;
  exp: number; // expiration (epoch secondes)
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const norm = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = norm.length % 4 ? 4 - (norm.length % 4) : 0;
  const bin = atob(norm + "=".repeat(pad));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function getSecret(): string {
  // En production, AUTH_SECRET doit être défini (.env.local). Fallback dev documenté.
  return process.env.AUTH_SECRET || "dev-secret-trekka-a-remplacer";
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    ENC.encode(getSecret()) as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const body = b64urlEncode(ENC.encode(JSON.stringify(payload)));
  const key = await hmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, ENC.encode(body) as BufferSource);
  return `${body}.${b64urlEncode(new Uint8Array(sig))}`;
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const key = await hmacKey();
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlDecode(sig) as BufferSource,
      ENC.encode(body) as BufferSource
    );
    if (!ok) return null;
    const payload = JSON.parse(DEC.decode(b64urlDecode(body))) as SessionPayload;
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
