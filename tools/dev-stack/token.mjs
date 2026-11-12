// Mints Clerk-shaped RS256 session tokens with the dev key, the same way the backend's
// own tests do (tests/support/tokens.js). The backend verifies them with Clerk's real
// verifyToken against CLERK_JWT_KEY, so sign-in, ownership and limits are enforced for real.
import { sign } from "node:crypto";
import { AUTHORIZED_PARTY, ISSUER, devKeys } from "./env.mjs";

const b64 = (v) => (Buffer.isBuffer(v) ? v : Buffer.from(JSON.stringify(v))).toString("base64url");

/** Dev user ids look like Clerk's: user_dev_<slug>. */
export function devUserId(slug) {
  const clean = String(slug ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  if (!clean) throw new Error("user slug must contain letters or digits");
  return `user_dev_${clean}`;
}

export function signSessionToken(sub, { expiresInSec = 600 } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT", kid: "ins_dev" };
  const payload = {
    sub,
    sid: `sess_${sub}`,
    azp: AUTHORIZED_PARTY,
    iss: ISSUER,
    iat: now,
    nbf: now - 5,
    exp: now + expiresInSec,
  };
  const input = `${b64(header)}.${b64(payload)}`;
  const signature = sign("RSA-SHA256", Buffer.from(input), devKeys().privateKey);
  return { token: `${input}.${signature.toString("base64url")}`, expiresAt: new Date(payload.exp * 1000).toISOString() };
}
