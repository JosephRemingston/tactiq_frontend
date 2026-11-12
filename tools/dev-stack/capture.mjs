// Captures real responses from the local API into .dev/samples/<name>.json.
// The app's TypeScript types are written from these, not from api_doc.md, where the two differ.
//   node tools/dev-stack/capture.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { API_PORT, DEV_DIR } from "./env.mjs";
import { devUserId, signSessionToken } from "./token.mjs";

const BASE = `http://127.0.0.1:${API_PORT}`;
const OUT = join(DEV_DIR, "samples");
mkdirSync(OUT, { recursive: true });

const token = signSessionToken(devUserId("capture")).token;
const results = [];

async function get(name, path, { auth = true, method = "GET", body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(auth ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  const headers = Object.fromEntries(
    ["x-request-id", "x-entitlement-remaining", "retry-after"].filter((h) => res.headers.has(h)).map((h) => [h, res.headers.get(h)]),
  );
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify({ path, method, status: res.status, headers, body: json }, null, 2));
  results.push(`${String(res.status).padEnd(4)} ${method.padEnd(6)} ${name}`);
  return json?.data;
}

const comps = await get("competitions", "/v1/competitions", { auth: false });
const wc = comps.competitions.find((c) => c.name === "FIFA World Cup");
await get("competition", `/v1/competitions/${wc.id}`, { auth: false });
await get("seasons", `/v1/competitions/${wc.id}/seasons`, { auth: false });

const analysed = await get("matches_analysed", "/v1/matches?analysed=true", { auth: false });
const final22 = analysed.matches.find((m) => m.kickoffAt.startsWith("2022-12-18"));
const final18 = analysed.matches.find((m) => m.kickoffAt.startsWith("2018-07-15"));
await get("matches_page", `/v1/matches?competitionId=${wc.id}&limit=5`, { auth: false });

const arg = final22.home.id;
const fra = final22.away.id;
await get("teams", `/v1/teams?competitionId=${wc.id}&limit=5`, { auth: false });
await get("team", `/v1/teams/${arg}`, { auth: false });
const squad = await get("team_players", `/v1/teams/${arg}/players`, { auth: false });
await get("team_coverage", `/v1/teams/${arg}/coverage`, { auth: false });
await get("team_style", `/v1/teams/${arg}/style`, { auth: false });

const papu = squad.players.find((p) => p.knownName === "Papu Gómez") ?? squad.players[0];
await get("player", `/v1/players/${papu.id}`, { auth: false });
await get("player_matches", `/v1/players/${papu.id}/matches`, { auth: false });

await get("search", "/v1/search?q=arg", { auth: false });
await get("search_concept", "/v1/search?q=press&types=concept", { auth: false });

const m = final22.id;
await get("match", `/v1/matches/${m}`, { auth: false });
await get("match_2018", `/v1/matches/${final18.id}`, { auth: false });
const lineups = await get("lineups", `/v1/matches/${m}/lineups`, { auth: false });
await get("events", `/v1/matches/${m}/events?limit=60`, { auth: false });
for (const depth of ["quick", "explore", "advanced"]) {
  await get(`insights_${depth}`, `/v1/matches/${m}/insights?depth=${depth}`, { auth: false });
  await get(`story_${depth}`, `/v1/matches/${m}/story?depth=${depth}`, { auth: false });
}
const fixtureOnly = (await get("matches_unanalysed", `/v1/matches?competitionId=${wc.id}&analysed=false&limit=3`, { auth: false })).matches[0];
await get("story_unavailable", `/v1/matches/${fixtureOnly.id}/story`, { auth: false });

const concepts = await get("concepts", "/v1/concepts", { auth: false });
await get("concept", `/v1/concepts/${concepts.concepts.find((c) => c.key === "ppda")?.key ?? concepts.concepts[0].key}`, { auth: false });
await get("metric_definitions", "/v1/metric-definitions", { auth: false });
await get("metric_definition", "/v1/metric-definitions/pressing.ppda", { auth: false });
await get("billing_products", "/v1/billing/products", { auth: false });
await get("ads_config_anon", "/v1/ads/config", { auth: false });

// Signed in (Free).
await get("me", "/v1/me");
await get("entitlements_before", "/v1/entitlements");
await get("ads_config_free", "/v1/ads/config");
await get("feed_empty", "/v1/me/feed");
await get("follow_team", `/v1/me/following/teams/${arg}`, { method: "PUT" });
await get("follow_competition", `/v1/me/following/competitions/${wc.id}`, { method: "PUT" });
await get("following", "/v1/me/following");
await get("feed", "/v1/me/feed");

// Gated: signed out, then Pro-only filter as Free.
await get("metrics_signed_out", `/v1/matches/${m}/metrics`, { auth: false });
await get("events_filter_free", `/v1/matches/${m}/events?type=shot`);

// Metered analysis views (costs 1 unit for this match).
await get("metrics", `/v1/matches/${m}/metrics?include=definitions`);
await get("metrics_shot_map", `/v1/matches/${m}/metrics?keys=shooting.shot_map&playerId=none`);
await get("shape", `/v1/matches/${m}/tactical-shape`);
await get("pressing", `/v1/matches/${m}/pressing`);
await get("transitions", `/v1/matches/${m}/transitions`);
await get("possessions", `/v1/matches/${m}/possessions?limit=10`);
const tagliafico = lineups.lineups[0].starters.find((p) => p.positionName === "Left Back") ?? lineups.lineups[0].starters[1];
await get("player_in_match", `/v1/matches/${m}/players/${tagliafico.playerId}`);
await get("compare", `/v1/matches/compare?a=${m}&b=${final18.id}&teamId=${fra}`);
await get("analysis_job_existing", `/v1/matches/${m}/analysis-jobs`, { method: "POST" });
await get("entitlements_after", "/v1/entitlements");

// Personal data.
const insights = (await get("insights_for_save", `/v1/matches/${m}/insights`, { auth: false })).insights;
await get("save_match", `/v1/me/saved-matches/${m}`, { method: "PUT" });
await get("save_insight", `/v1/me/saved-insights/${insights[0].id}`, { method: "PUT" });
await get("saved_matches", "/v1/me/saved-matches");
await get("saved_insights", "/v1/me/saved-insights");
const note = await get("note_create", "/v1/me/notes", { method: "POST", body: { subjectType: "match", subjectId: m, body: "Messi kept drifting into zone 14." } });
await get("notes", "/v1/me/notes");
const col = await get("collection_create", "/v1/me/collections", { method: "POST", body: { name: "Finals", description: "World Cup finals worth rewatching" } });
await get("collection_add", `/v1/me/collections/${col.collection.id}/items`, { method: "PUT", body: { itemType: "match", itemId: m } });
await get("collections", "/v1/me/collections");
await get("collection", `/v1/me/collections/${col.collection.id}`);
await get("learning_put", "/v1/me/learning/ppda", { method: "PUT", body: { status: "completed" } });
await get("learning", "/v1/me/learning");
await get("sessions", "/v1/me/sessions");
await get("subscription", "/v1/billing/subscription");
await get("me_patch", "/v1/me", { method: "PATCH", body: { displayName: "Capture" } });
await get("note_delete", `/v1/me/notes/${note.note.id}`, { method: "DELETE" });

console.log(results.join("\n"));
console.log(`\n${results.length} responses written to ${OUT}`);
