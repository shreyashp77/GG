# Repository Guidelines

## Project Structure & Module Organization

Application code lives in `src/`. React screens and reusable UI are in `src/components/`; cricket simulation logic and shared engine types are in `src/engine/`; season scheduling and standings live in `src/season/`. Static franchise and squad records belong in `src/data/`, persistence adapters in `src/services/`, and Web Worker entry points in `src/workers/`. Global styling is in `src/styles.css`. PWA assets (`sw.js`, manifest, icon) are served from `public/`. Product scope and acceptance criteria are documented in `GAME_PLAN.md`.

Keep tests beside the code they verify, using `*.test.ts` or `*.test.tsx` (for example, `src/season/schedule.test.ts`).

## Build, Test, and Development Commands

- `npm install` installs the locked dependencies from `package-lock.json`.
- `npm run dev` starts the Vite development server with hot reload.
- `npm test` runs the complete Vitest suite once in jsdom.
- `npm run test:watch` reruns affected tests during development.
- `npm run build` type-checks with project references, then creates the production bundle.
- `npm run preview` serves the built bundle for a local production check.

Run `npm test` and `npm run build` before opening a pull request. There is currently no separate lint or coverage script.

## Coding Style & Naming Conventions

Use strict TypeScript, ES modules, two-space indentation, double quotes, and semicolons. Follow the existing formatter-friendly layout and include trailing commas in multiline structures. Name React components and exported types in `PascalCase`, functions and variables in `camelCase`, and constants in `UPPER_SNAKE_CASE`. Component filenames use `PascalCase.tsx`; non-component modules use descriptive `camelCase.ts` names. Prefer `import type` for type-only dependencies.

Keep simulation and scheduling functions deterministic and side-effect free. Browser storage, Worker messaging, and other platform boundaries belong in `services/` or `workers/`.

## Testing Guidelines

Vitest provides the runner; component tests use Testing Library with jsdom. Write behavior-focused `describe`/`it` cases and fixed seeds for simulations. Cover cricket state transitions, data invariants, persistence behavior, and visible user outcomes. Clean up rendered components and isolate `localStorage` or IndexedDB state between tests.

## Commit & Pull Request Guidelines

The current history uses a short, capitalized, imperative subject (for example, `Build initial GG Cricket Manager slices`). Keep commits focused and avoid mixing data, engine, and UI refactors without reason. Pull requests should summarize the change, note gameplay or data implications, list verification commands, and link relevant issues. Include screenshots for visual changes and call out save-schema, database, ruleset, or PWA cache changes explicitly.
