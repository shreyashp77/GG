# GG Cricket Manager — IPL-First Browser Game

## Summary

Build a responsive, offline-capable browser management game inspired by Cricket Coach 2014’s database-heavy simulation, tactical depth, overhead 2D match view, and deliberately simple presentation. The reference game emphasizes realistic simulation over 3D graphics, detailed player attributes, strategy, and a 2D view.

A career begins after the real 2026 IPL season. The player chooses one of the ten real franchises, manages releases and retentions, enters an interactive 2027 auction, and continues through an indefinite multi-season career. All starting cricketers are real; clearly labelled fictional youngsters enter later as real players retire.

Reference links:

- Cricket Coach: https://www.cricketcoachgame.com/
- Official 2026 IPL squads: https://documents.iplt20.com/bcci/documents/1763209725967_TATA%20IPL%202026%20-%20Playing%20Squad%20-%2015.11.2025%20%281%29.pdf
- Official 2026 IPL playing conditions: https://documents.iplt20.com/bcci/documents/1775736835406_TATA_IPL_2026_Match_Playing_Conditions.pdf
- Cricsheet: https://cricsheet.org/
- Cricsheet JSON format: https://cricsheet.org/format/json/
- Cricsheet player register: https://cricsheet.org/register/

## Product and Gameplay

- Include the ten real IPL franchises, real 2026 squads, contract deductions, venues, and historical 2026 results. Use official IPL squad and playing-condition documents as the rules source.
- Generate a fictional 2027 schedule using the 74-match structure: 70 league matches, 14 per franchise, then Qualifier 1, Eliminator, Qualifier 2, and Final.
- Career hub screens: inbox/calendar, squad, player profiles, training, fitness/injuries, morale/form, contracts, auction, fixtures, results, standings, statistics, records, board confidence, and job market.
- Coaching systems: XI and batting-order selection, captain/wicketkeeper assignment, player roles, individual training focus, fatigue management, injuries, form, morale, ageing, development, decline, and retirement.
- Board confidence uses season expectations, results, squad management, and recent form. Sustained failure can lead to dismissal; unemployed coaches can advance time and apply for vacancies, while successful coaches receive offers.
- Use an IPL-style annual offseason: optional releases, retained salaries, ₹125 crore cap, 18–25-player squads, maximum eight overseas squad members, and maximum four overseas players in the XI. Future rule changes are not guessed; careers use this frozen versioned ruleset.
- Run a live ascending auction with player sets, bidding increments, AI competitors, purse/slot warnings, watchlists, maximum-bid instructions, accelerated sets, pause/skip controls, and delegation to an assistant.
- User matches support toss decisions, team confirmation, batting intent per batter, bowler selection, bowling plan, and preset attacking/balanced/defensive fields. Decisions default to over boundaries, with automatic pauses for wickets, innings changes, tactical time-outs, and close finishes.
- Provide normal, fast, over-only, and instant-result speeds. AI-versus-AI matches simulate instantly.
- Present matches with a flat overhead SVG ground, moving ball/fielder dots, outcome icons, text commentary, scorecard, partnerships, required rate, wagon-wheel-style summaries, and tactical panels. No 3D models, player likenesses, audio, or elaborate animation.
- Use a dense desktop management layout that collapses into tabs, drawers, and stacked cards on tablet and phone.

## Data, Simulation, and Technical Design

- Build a reproducible offline data pipeline from men’s T20 JSON and the stable player registry supplied by Cricsheet.
- Include every real male player who appeared in covered T20 cricket from 2021 through the end of IPL 2026, plus manual overrides for every 2026 IPL squad member. Older matches remain available when calculating career statistics.
- Enrich IPL players with nationality, date of birth, batting hand, bowling style, role, overseas status, 2026 franchise, and salary. Missing global metadata receives a documented neutral fallback and is listed in a generated data-quality report.
- Show historical real T20 statistics separately from statistics accumulated in the simulated career.
- Derive visible 1–100 attributes using recency-weighted, competition-strength-adjusted empirical estimates with sample-size shrinkage:
  - Batting: control, power, strike rotation, pace/spin skill, and powerplay/middle/death performance.
  - Bowling: accuracy, economy, wicket threat, variation, and phase performance.
  - Supporting: fielding, wicketkeeping, leadership, fitness, current form, and potential.
- Implement the match engine as pure TypeScript in a Web Worker. A seeded random generator makes identical inputs reproducible.
- Resolve each delivery from batter/bowler skills, phase, handedness matchup, venue/pitch, dew, form, fatigue, tactics, field preset, match pressure, and controlled randomness. Emit legal delivery events for runs, extras, wickets, strike changes, free hits, over completion, chase completion, ties, and super overs.
- Calibrate probabilities against recent real IPL distributions rather than hard-coding individual scorecards.
- Build with React, TypeScript, and Vite as an installable static PWA. Use IndexedDB for local career slots and a service worker for offline play; require no backend, login, or network connection after installation.
- Define versioned public domain models for `DatabasePack`, `Player`, `PlayerRatings`, `Franchise`, `Contract`, `CareerSave`, `Season`, `Fixture`, `AuctionState`, `MatchState`, `Tactics`, and `MatchEvent`.
- Expose pure engine interfaces for new-career creation, schedule generation, auction bidding/resolution, delivery simulation, match fast-simulation, season advancement, development/retirement, and AI decision-making.
- Export saves as versioned JSON containing the database version, ruleset version, random seed, career state, and checksum. Imports reject corruption and migrate older supported schemas.
- Deliver in vertical slices:
  1. Application shell, frozen database, player browser, and career creation.
  2. Deterministic single-match engine, scorecard, tactics, AI, and 2D presentation.
  3. Full 2027 season, standings, playoffs, statistics, and historical records.
  4. Releases, contracts, live/delegated auction, training, injuries, development, and regens.
  5. Board confidence, dismissal/job offers, multi-season progression, offline saves, calibration, and responsive polish.

## Test and Acceptance Plan

- Validate unique player identities, team assignments, overseas classifications, salary totals, rating bounds, source-stat aggregates, and required metadata for every IPL player.
- Verify auction purse, roster size, overseas limits, bid increments, AI withdrawal, delegation, releases, and impossible-roster handling.
- Unit-test cricket laws and state transitions: legal balls, wides/no-balls, dismissals, strike rotation, bowler limits, innings completion, successful chases, ties, super overs, and preset-field effects.
- Confirm seeded simulations are deterministic and that fast simulation produces the same result as animated playback for the same seed and decisions.
- Simulate at least 10,000 neutral matches and multiple complete seasons. Require aggregate scoring, wicket, boundary, economy, chase-win, and phase distributions to remain within agreed statistical tolerances—initially 5% of the recent IPL baseline.
- Validate a season has 70 league fixtures, 14 matches per team, correct points and net run rate, four valid playoff fixtures, and one champion.
- Run long-career tests covering 20 seasons, ageing, retirement, fictional-player generation, squad viability, auctions, firing, unemployment, and job changes.
- Test save/export/import round trips, corrupted imports, schema migrations, multiple save slots, refresh recovery, and offline startup.
- Use browser end-to-end tests at desktop, tablet, and phone widths for career creation, XI selection, a complete match, auction flow, season completion, and job switching.

## Assumptions and Boundaries

- Working title is “GG Cricket Manager”; it can be renamed without changing game architecture.
- Only the men’s IPL is actively scheduled in v1. Other T20 competitions and internationals provide historical rating data but are not simulated in the background.
- All launch players and 2026 history are real. Fictional players are clearly marked and only appear in later career years.
- The initial ruleset stays fixed even if the real IPL changes its future format.
- V1 excludes rain-shortened matches/DLS, staff hiring, facilities, sponsors, ticketing, stadium ownership, player photos, real logos, multiplayer, cloud synchronization, and the database editor.
