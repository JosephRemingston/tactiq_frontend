#!/usr/bin/env node
// Tactiq dev stack: local Postgres + the unmodified backend + a dev token server.
//
//   node tools/dev-stack/run.mjs pg:start | pg:stop | pg:status
//   node tools/dev-stack/run.mjs setup        migrate, seed, load and analyse the two World Cup finals
//   node tools/dev-stack/run.mjs api          start Postgres (if needed), the API on :3000 and tokens on :3101
//   node tools/dev-stack/run.mjs token <name> print a session token for user_dev_<name>
//   node tools/dev-stack/run.mjs reverse      adb reverse the API and token ports to the emulator
//
// The backend folder is only read and executed, never written to (storage lives in .dev/).
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { API_PORT, APP_ROOT, BACKEND_ROOT, DEV_DIR, PG_PORT, TOKEN_PORT, backendEnv } from "./env.mjs";
import { devUserId, signSessionToken } from "./token.mjs";

const PG_BIN = "/opt/homebrew/opt/postgresql@18/bin";
const PG_DATA = join(DEV_DIR, "pg");
const PG_OPTS = `-p ${PG_PORT} -k /tmp -c listen_addresses=127.0.0.1`;
const ADB = join(process.env.ANDROID_HOME ?? join(homedir(), "Library/Android/sdk"), "platform-tools", "adb");

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} exited with ${r.status}`);
}

function pgRunning() {
  return spawnSync(join(PG_BIN, "pg_isready"), ["-h", "127.0.0.1", "-p", String(PG_PORT)], { stdio: "ignore" }).status === 0;
}

function pgStart() {
  if (pgRunning()) return;
  mkdirSync(DEV_DIR, { recursive: true });
  if (!existsSync(join(PG_DATA, "PG_VERSION"))) {
    run(join(PG_BIN, "initdb"), ["-D", PG_DATA, "-U", "tactiq", "--auth=trust", "-E", "UTF8", "--locale=C"]);
  }
  run(join(PG_BIN, "pg_ctl"), ["-D", PG_DATA, "-o", PG_OPTS, "-l", join(DEV_DIR, "pg.log"), "-w", "start"]);
  spawnSync(join(PG_BIN, "createdb"), ["-h", "127.0.0.1", "-p", String(PG_PORT), "-U", "tactiq", "tactiq_dev"], { stdio: "ignore" });
}

function backend(args) {
  run(process.execPath, ["cli.js", ...args], { cwd: BACKEND_ROOT, env: backendEnv() });
}

function setup() {
  pgStart();
  backend(["db:migrate"]);
  backend(["db:seed"]);
  // Both finals, from the backend's bundled fixtures (no network). Syncs all 128 fixtures of
  // World Cup 2022 and 2018 and runs ingestion, analysis and insights for the two finals.
  backend(["sync:statsbomb", "--matches", "3869685,8658", "--local", join(BACKEND_ROOT, "tests", "fixtures", "statsbomb"), "--inline"]);
  backend(["analytics:styles"]);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 4096) reject(new Error("body too large"));
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

/** POST /dev/token {"user":"ada"} -> {"token","expiresAt","userId"}. Dev only, bound to localhost. */
function tokenServer() {
  const server = createServer(async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    try {
      if (req.method !== "POST" || req.url !== "/dev/token") return send(404, { error: "not found" });
      const body = JSON.parse((await readBody(req)) || "{}");
      const userId = devUserId(body.user ?? "fan");
      send(200, { userId, ...signSessionToken(userId) });
    } catch (err) {
      send(400, { error: err.message });
    }
  });
  server.listen(TOKEN_PORT, "127.0.0.1", () => console.log(`dev tokens on http://127.0.0.1:${TOKEN_PORT}/dev/token`));
  return server;
}

function api() {
  pgStart();
  const tokens = tokenServer();
  const child = spawn(process.execPath, ["index.js"], { cwd: BACKEND_ROOT, env: backendEnv(), stdio: "inherit" });
  const stop = () => {
    tokens.close();
    child.kill("SIGTERM");
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  child.on("exit", (code) => {
    tokens.close();
    process.exit(code ?? 0);
  });
}

function reverse() {
  for (const port of [API_PORT, TOKEN_PORT]) run(ADB, ["reverse", `tcp:${port}`, `tcp:${port}`]);
  console.log(`emulator can reach the API at http://localhost:${API_PORT} and tokens at http://localhost:${TOKEN_PORT}`);
}

const [command, arg] = process.argv.slice(2);
process.chdir(APP_ROOT);
switch (command) {
  case "pg:start":
    pgStart();
    break;
  case "pg:stop":
    if (pgRunning()) run(join(PG_BIN, "pg_ctl"), ["-D", PG_DATA, "-w", "stop"]);
    break;
  case "pg:status":
    console.log(pgRunning() ? `postgres up on 127.0.0.1:${PG_PORT}` : "postgres down");
    break;
  case "setup":
    setup();
    break;
  case "api":
    api();
    break;
  case "token":
    console.log(signSessionToken(devUserId(arg ?? "fan")).token);
    break;
  case "reverse":
    reverse();
    break;
  default:
    console.log("usage: node tools/dev-stack/run.mjs pg:start|pg:stop|pg:status|setup|api|token <name>|reverse");
    process.exit(command ? 1 : 0);
}
