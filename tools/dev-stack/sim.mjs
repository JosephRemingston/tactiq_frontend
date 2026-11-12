// Reproduces the GitHub Actions worker run (jobs.yml) against a throwaway local database.
//   node tools/dev-stack/sim.mjs <cli|worker> [args...]     env overrides: SIM_ALLOWLIST, SIM_SOURCE
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { BACKEND_ROOT, DEV_DIR, PG_PORT, backendEnv } from "./env.mjs";

const [kind, ...args] = process.argv.slice(2);
const env = {
  ...backendEnv(),
  NODE_ENV: "production",
  DATABASE_URL: `postgres://tactiq@127.0.0.1:${PG_PORT}/tactiq_sim`,
  STORAGE_FS_ROOT: join(DEV_DIR, "storage-sim"),
  STATSBOMB_SOURCE: process.env.SIM_SOURCE ?? "github",
  STATSBOMB_OPEN_DATA_LOCAL_DIR: "",
  STATSBOMB_RATE_PER_SECOND: "2",
  STATSBOMB_COMPETITION_ALLOWLIST: process.env.SIM_ALLOWLIST ?? "",
  QUEUE_BACKOFF_BASE_MS: "60000",
  WORKER_BUDGET_MS: process.env.SIM_BUDGET ?? "1500000",
  BILLING_FAKE_VERIFIER: "false",
  GOOGLE_PLAY_PACKAGE_NAME: "",
  GOOGLE_PLAY_RTDN_TOKEN: "",
};
const r = spawnSync(process.execPath, [kind === "cli" ? "cli.js" : "worker.js", ...args], { cwd: BACKEND_ROOT, env, stdio: "inherit" });
process.exit(r.status ?? 1);
