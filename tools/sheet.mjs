#!/usr/bin/env node
// Contact sheet: tiles screenshots into one PNG via headless Chrome (no image libraries needed).
//   node tools/sheet.mjs <out.png> <cols> <a.png> <b.png> ...
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

const [out, colsArg, ...files] = process.argv.slice(2);
const cols = Number(colsArg) || 4;
const tile = 206;
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#888;font:600 11px -apple-system,sans-serif}
.g{display:grid;grid-template-columns:repeat(${cols},${tile}px);gap:6px;padding:6px}
figure{margin:0;background:#fff}figcaption{padding:3px 4px;background:#222;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
img{display:block;width:${tile}px}</style><div class="g">${files
  .map((f) => `<figure><figcaption>${basename(f, ".png")}</figcaption><img src="file://${resolve(f)}"></figure>`)
  .join("")}</div>`;
const page = resolve(dirname(out), "_sheet.html");
writeFileSync(page, html);
const width = cols * (tile + 6) + 6;
execFileSync("node", [resolve("tools/shot.mjs"), `file://${page}`, out, "--width", String(width), "--height", "900", "--full", "--wait", "1500", "--scale", "1"], { stdio: "inherit" });
