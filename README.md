# GG Cricket Manager

An offline-first IPL management game in active development. The current vertical
slice includes career creation, the 2026 frozen IPL squad database, a club hub,
player browsing, IndexedDB persistence and a PWA shell.

## Run locally

```bash
npm install
npm run dev
```

## Verify

```bash
npm test
npm run build
```

## Data status

Squads, contract deductions and overseas flags are frozen from the official
`TATA IPL 2026 – Playing Squad – 15.11.2025` sheet. Roles and ratings are
deterministic starter estimates. The UI marks the remaining biographical and
empirical attributes as awaiting Cricsheet registry enrichment.
