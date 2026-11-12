# Tactiq app

React Native (Expo SDK 58, expo-router) client for the Tactiq backend in `../football_analytics`. Android-first. The look and motion follow `design.md`; screens, content and rules follow the UI brief; the API contract is `api_doc.md`.

## Run it

You need Node 22+, Homebrew `postgresql@18`, and the backend repo next to this one.

```sh
npm install
npm run dev:setup     # once: local Postgres in .dev/pg (port 5433), migrate, seed, load + analyse the 2022 and 2018 finals
npm run dev:api       # API on :3000 and the dev token server on :3101 (leave running)
npx expo start        # then press a for Android, w for web
npm run dev:reverse   # Android only: lets the emulator reach :3000 and :3101
```

The dev stack runs the backend unmodified with its own environment. It never reads the backend's `.env` (which points at the production database) and refuses non-local databases. See `tools/dev-stack/env.mjs`.

Do not start Expo with `CI=1`: in CI mode Metro stops watching files, so edits and new routes don't show up.

## Simulated providers

Sign-in (Clerk), Google Play Billing and AdMob sit behind adapters in `src/services/`. Until real keys and store accounts exist:

- **Sign-in** gets Clerk-shaped tokens from the dev token server; the backend verifies them for real.
- **Billing** sends the backend's fake purchase tokens to the real verify route, so every purchase and subscription state is a real server response. Pick the outcome in the dev menu.
- **Ads** render a labelled Sponsored placeholder in the slots the server returns.

## Dev menu

In development builds a small **Dev** button sits above the tab bar. It switches between Free, Pro, new and signed-out users, forces any screen state (loading, empty, limit reached, error…), sets the simulated purchase result and subscription state, and opens the design-system gallery (`/gallery`).

## Checks

```sh
npm run typecheck
npm run lint
npm test              # API client, ad placement and pitch geometry
```

Screenshots of the web build at the brief's 412 × 917 dp frame:

```sh
node tools/shot.mjs /match/<id> .dev/shots/match.png --query "theme=dark&devUser=profan" --dark
node tools/sheet.mjs .dev/shots/sheet.png 5 .dev/shots/*.png     # contact sheet
```

`devUser`, `theme`, `forced`, `purchase` and `slow` URL parameters work in development web builds only (`src/dev/webHarness.ts`).

## Layout

- `src/app/` routes (38 screens and sheets), `src/features/` match centre and analysis parts
- `src/ui/` design-system primitives, `src/components/` shared app components, `src/pitch/` pitch canvas and layers
- `src/api/` typed client, endpoints and query hooks; `src/services/` auth, billing, ads, paywall
- `tools/dev-stack/` local backend runner; `.dev/` local data, keys, samples and screenshots (git-ignored)
