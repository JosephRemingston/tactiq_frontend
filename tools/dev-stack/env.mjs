// Builds the complete environment for running the Tactiq backend locally.
//
// The backend loads its own `.env` (which targets the production database) for any
// variable that is not already set in the process environment. An empty string still
// counts as "set", so every variable the backend reads is set here explicitly and
// nothing can fall through to that file.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { generateKeyPairSync } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = resolve(here, "..", "..");
export const BACKEND_ROOT = resolve(APP_ROOT, "..", "football_analytics");
export const DEV_DIR = join(APP_ROOT, ".dev");

export const PG_PORT = 5433;
export const API_PORT = 3000;
export const TOKEN_PORT = 3101;
export const DATABASE_URL = `postgres://tactiq@127.0.0.1:${PG_PORT}/tactiq_dev`;
export const AUTHORIZED_PARTY = "https://dev.tactiq.local";
export const ISSUER = "https://tactiq-dev.clerk.accounts.dev";
export const PACKAGE_NAME = "app.tactiq.dev";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

/** Dev RSA key pair, created once and kept in .dev/keys so tokens stay valid across restarts. */
export function devKeys() {
  const dir = join(DEV_DIR, "keys");
  const pub = join(dir, "public.pem");
  const priv = join(dir, "private.pem");
  if (!existsSync(pub) || !existsSync(priv)) {
    mkdirSync(dir, { recursive: true });
    const k = generateKeyPairSync("rsa", { modulusLength: 2048 });
    writeFileSync(pub, k.publicKey.export({ type: "spki", format: "pem" }));
    writeFileSync(priv, k.privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
  }
  return { publicKey: readFileSync(pub, "utf8"), privateKey: readFileSync(priv, "utf8") };
}

/** Every variable in the backend's env schema (configs/env.js), plus the extra names its .env sets. */
export function backendEnv() {
  const host = new URL(DATABASE_URL).hostname;
  if (!LOCAL_HOSTS.has(host)) throw new Error(`refusing to run against non-local database host "${host}"`);

  const env = {
    NODE_ENV: "development",
    PORT: String(API_PORT),

    DATABASE_URL,
    DATABASE_POOL_MAX: "5",
    REDIS_URL: "",

    STORAGE_DRIVER: "fs",
    STORAGE_FS_ROOT: join(DEV_DIR, "storage"),
    S3_ENDPOINT: "",
    S3_REGION_OVERRIDE: "",
    S3_BUCKET_RAW: "tactiq-raw",
    S3_ACCESS_KEY_ID: "",
    S3_SECRET_ACCESS_KEY: "",
    EVENTS_STORE_RAW: "false",

    CLERK_SECRET_KEY: "",
    CLERK_PUBLISHABLE_KEY: "",
    CLERK_JWT_KEY: devKeys().publicKey,
    CLERK_AUTHORIZED_PARTIES: AUTHORIZED_PARTY,
    CLERK_WEBHOOK_SIGNING_SECRET: "",

    STATSBOMB_SOURCE: "local",
    STATSBOMB_OPEN_DATA_BASE_URL: "https://raw.githubusercontent.com/statsbomb/open-data/master/data",
    STATSBOMB_OPEN_DATA_LOCAL_DIR: join(BACKEND_ROOT, "tests", "fixtures", "statsbomb"),
    STATSBOMB_COMPETITION_ALLOWLIST: "43:106,43:3",
    STATSBOMB_RATE_PER_SECOND: "1000",
    STATSBOMB_USER_AGENT: "Tactiq/1.0 (dev)",
    SPORTMONKS_API_TOKEN: "",

    TEAM_STYLE_DELAY_MS: "0",
    QUEUE_MAX_ATTEMPTS: "5",
    QUEUE_BACKOFF_BASE_MS: "0",
    WORKER_BUDGET_MS: String(20 * 60_000),

    CORS_ORIGINS: "",
    // Generous limits: the emulator, the gallery and hot reloads all share one IP.
    THROTTLE_IP_PER_MIN: "2000",
    THROTTLE_USER_PER_MIN: "2000",
    THROTTLE_IP_BACKSTOP_PER_MIN: "5000",
    CACHE_TTL_MATCH_SECONDS: "60",
    TRUST_PROXY: "",
    EDGE_SHARED_SECRET: "",

    // Billing with the backend's fake verifier: tokens look like fake:<productId>:<state>[:<days>[:<accountId>]].
    GOOGLE_PLAY_PACKAGE_NAME: PACKAGE_NAME,
    GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: "",
    GOOGLE_PLAY_RTDN_TOKEN: "dev-rtdn-token",
    BILLING_FAKE_VERIFIER: "true",

    ADMOB_NATIVE_UNIT_ID: "",
    ADMOB_BANNER_UNIT_ID: "",

    // Set in the backend's .env but not in its schema; blanked so nothing leaks through.
    RUN_MIGRATIONS: "",
    WORKER_TRIGGER_SECRET: "",
    VITE_CLERK_PUBLISHABLE_KEY: "",
  };
  // TRUST_PROXY is a coerced number in the schema; an empty string would coerce to 0, which is fine.
  return { ...process.env, ...env };
}
