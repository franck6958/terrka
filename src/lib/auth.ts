import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "./session";

// Hachage de mot de passe (PBKDF2-HMAC-SHA256, Web Crypto — sans dépendance native)
// et lecture de la session courante côté serveur.

// Mot de passe par défaut des comptes de démonstration (cf. README).
export const DEFAULT_PASSWORD = "trekka2026";

const ENC = new TextEncoder();
const PBKDF2_ITERATIONS = 100_000;

function toB64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function derive(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ENC.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    // `salt as BufferSource` : un Uint8Array<ArrayBufferLike> n'est pas directement
    // assignable à BufferSource avec les typings récents (SharedArrayBuffer possible).
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256
  );
  return new Uint8Array(bits);
}

// Format stocké : pbkdf2$<saltB64>$<hashB64>
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt);
  return `pbkdf2$${toB64(salt)}$${toB64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "pbkdf2") return false;
  const salt = fromB64(parts[1]);
  const expected = parts[2];
  const hash = await derive(password, salt);
  // Comparaison à temps constant.
  const a = toB64(hash);
  if (a.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

// Utilisateur de la session courante (null si non authentifié).
export async function getSessionUser(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

// Nom de l'acteur courant pour le journal d'audit (BF-15) — « Système » à défaut.
export async function getActeurNom(): Promise<string> {
  const user = await getSessionUser();
  return user?.nom ?? "Système";
}
