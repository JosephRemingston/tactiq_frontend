#!/usr/bin/env node
// Screenshots of the Expo web build with exact device metrics, via the Chrome DevTools protocol.
//   node tools/shot.mjs <route> <out.png> [--query a=b&c=d] [--width 412] [--height 917] [--full]
//        [--dark] [--wait 2500] [--eval "js"] [--scale 2]
// --full captures the whole scrollable page (the app's main ScrollView is measured and expanded).
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const flag = (name) => args.includes(`--${name}`);
const [route, out] = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--") && !["--full", "--dark"].includes(args[i - 1])));
if (!route || !out) {
  console.error("usage: node tools/shot.mjs <route> <out.png> [--query q] [--width 412] [--height 917] [--full] [--dark] [--wait ms] [--eval js]");
  process.exit(1);
}
const width = Number(opt("width", 412));
const height = Number(opt("height", 917));
const scale = Number(opt("scale", 2));
const wait = Number(opt("wait", 2500));
const query = opt("query", "");
const evalJs = opt("eval", "");
const after = Number(opt("after", 600));
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), "tactiq-shot-"));

const chrome = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--hide-scrollbars",
  "--disable-gpu",
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
let id = 0;
const pending = new Map();
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const msg = { id: ++id, method, params, ...(sessionId ? { sessionId } : {}) };
    pending.set(msg.id, { resolve, reject });
    ws.send(JSON.stringify(msg));
  });

try {
  let ver;
  for (let i = 0; i < 50; i++) {
    try {
      ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
      break;
    } catch {
      await sleep(100);
    }
  }
  if (!ver) throw new Error("chrome did not start");
  ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) p.reject(new Error(m.error.message));
      else p.resolve(m.result);
    }
  });
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId);
  await s("Page.enable");
  await s("Runtime.enable");
  await s("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: true });
  await s("Emulation.setTouchEmulationEnabled", { enabled: true });
  await s("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: flag("dark") ? "dark" : "light" }] });
  const url = /^(https?|file):/.test(route) ? route : `http://localhost:8081${route}${query ? `?${query}` : ""}`;
  await s("Page.navigate", { url });
  await sleep(wait);
  if (evalJs) {
    const r = await s("Runtime.evaluate", { expression: evalJs, returnByValue: true, awaitPromise: true });
    console.log(JSON.stringify(r.result?.value ?? r.result, null, 1));
    await sleep(after);
  }
  let clipHeight = height;
  if (flag("full")) {
    // Measure the tallest scroll content and grow the viewport to fit it.
    const r = await s("Runtime.evaluate", {
      expression: `Math.max(document.body.scrollHeight, ...[...document.querySelectorAll('div')].filter(d => { const cs = getComputedStyle(d); return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && d.scrollHeight > d.clientHeight; }).map(d => d.scrollHeight + d.getBoundingClientRect().top + (window.innerHeight - d.getBoundingClientRect().bottom)))`,
      returnByValue: true,
    });
    clipHeight = Math.min(Math.max(height, Math.ceil(r.result.value)), 8000);
    await s("Emulation.setDeviceMetricsOverride", { width, height: clipHeight, deviceScaleFactor: scale, mobile: true });
    await sleep(900);
  }
  const shot = await s("Page.captureScreenshot", { format: "png" });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, Buffer.from(shot.data, "base64"));
  console.log(`${out} (${width}x${clipHeight})`);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  try {
    ws?.close();
  } catch {}
  chrome.kill("SIGKILL");
  await sleep(200);
  rmSync(profile, { recursive: true, force: true });
}
