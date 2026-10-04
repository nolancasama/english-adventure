# My English Adventure

A mobile-first, offline-capable English-learning PWA for a young Japanese beginner. The MVP contains one ten-lesson world, short data-driven activities, local rewards and mastery, collectible pets, and a parent view. It has no backend and makes no runtime network requests.

## Run locally

Prerequisites: a current Node.js LTS release and npm.

```bash
npm install
npm run dev
```

Vite prints the local development URL. Audio uses bundled recordings when a key exists in `src/audio/manifest.ts`, otherwise it falls back to the browser's speech synthesis support.

## Build and preview

```bash
npm run build
npm run preview
```

The production build generates the web manifest and service worker. The service worker precaches the app shell, local assets, icons, fonts, and recorded audio so an installed app works offline after its first successful load.

## Validate

```bash
npm run typecheck
npm test
npm run build
```

The full browser playthrough is intentionally separate:

```bash
npm run e2e
```

That command builds the production app, starts `vite preview`, and runs Playwright at a 320×640 viewport. Install the Chromium browser once with `npx playwright install chromium` if Playwright asks for it.

## Add a lesson

The content model is deliberately data-first. Do not change `src/content/types.ts`; it is the frozen content contract.

1. Add every new word or phrase to `src/content/items.ts`. Give each item a stable, kebab-case id and a distinct local visual.
2. Add any tracked sentence frame to `src/content/patterns.ts` and reference its id from matching items.
3. Add the lesson data to `src/content/lessons.ts`, referring only to existing item ids. Normal lessons author their question list; review and boss lessons use a `generate` specification.
4. Keep activities in the hear → recognise → build progression. The shared activity registry renders question types, so a lesson must not add a one-off screen.
5. Run the validation commands above. Content integrity tests ensure referenced items and patterns exist and generated lessons remain valid.

User-facing and curriculum decisions live in `DESIGN_DECISIONS.md`. Implementation status and known limitations live in `CURRENT_STATE.md`.
