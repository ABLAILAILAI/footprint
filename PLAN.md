# Project Plan

<!-- Claude keeps this file current; see "Keeping PLAN.md" in CLAUDE.md. -->

## The App

Footprint is a privacy-first web app, for Haoran's own use: it turns data
exports the user requests themselves from platforms like YouTube, Spotify,
Netflix, and Instagram into an animated, story-style "year in review" report.
Everything is parsed and analyzed 100% in the browser — nothing is ever
uploaded — because these platforms don't offer usable APIs for this, and
"your data never leaves your device" is the core premise.

## Done

- 2026-10-15: M4 — YouTube parser, in both formats Google actually
  delivers (`src/parsers/youtubeJson.js` and `youtubeHtml.js`, sharing
  common logic in `youtubeShared.js`). Built and verified against
  Haoran's real downloaded Takeout export, not just invented samples —
  see Problems for what that caught. Both skip ad impressions (entries
  formatted exactly like real watches, flagged only by a hidden
  "From Google Ads" detail — found by inspecting the real file) so they
  don't pollute stats. 15 automated tests; also ran directly against
  Haoran's real `search-history.html` (5517 entries): parsed 5033 events
  (5034 search, 34 watch) and correctly skipped the 484 ad entries, with
  no crash and no console errors. Haoran then confirmed it himself by
  actually dragging the real zip onto the import box (not tap-to-browse) —
  got the same "YouTube: 5033 events (484 skipped)" result, which also
  finally confirms the real drag gesture works (pending since M3).
- 2026-10-20: M4 re-verified against the live production site
  (ablailailai.github.io/footprint, not just local dev) with all 6 real
  Takeout zip parts. Part 1 matched the earlier dev-server result exactly
  (5033 events, 484 skipped); Part 2 — a different real file, never
  tested before — parsed cleanly too (1762 events, 652 skipped); Parts
  3-5 were correctly tagged "Unrecognized file" (they're other YouTube
  data like playlists/library, not watch/search history) instead of
  crashing or mismatching. Good real-world confidence in both the
  parser and the deployed build.
- 2026-10-14: Visual polish pass — the import box and the mock-data tool
  now live in distinct, consistently-styled cards with section headers
  explaining what each is for, instead of being bare, unlabeled blocks.
  No functional changes; checked at both desktop and phone width, and
  Haoran confirmed it looks right.
- 2026-10-14: M3 — drag-and-drop/tap-to-browse import box
  (`src/ImportZone.jsx`) with platform auto-detection by filename/structure
  (`src/detectPlatform.js`, works on standalone files and inside zips via
  JSZip). Covered by 7 automated tests (`npm test`); the click-to-browse
  path was also verified live in the browser. The actual drag-and-drop
  gesture itself is still unverified by Haoran — see Problems.
- 2026-10-13: M1 — Vite + React (JavaScript) project scaffolded, minimal
  Footprint placeholder page, GitHub Actions workflow to build and deploy to
  GitHub Pages on every push to `main`. Verified locally with `npm run dev`.
- 2026-10-13: M2 — unified event format (`src/db.js`), a mock data generator
  (`src/mockEvents.js`) standing in for real parsers, and local storage via
  Dexie/IndexedDB. A "Load mock data" button adds a batch of fake
  YouTube/Spotify/Netflix/Instagram events and shows the total count;
  Haoran confirmed clicking it repeatedly keeps adding to the count, and
  refreshing the page keeps the same number instead of resetting to 0 —
  proving it's reading from IndexedDB, not just React state.

## Next

- M5: Spotify parser (Extended Streaming History JSON)
- M6: Netflix + Instagram parsers
- M7: Stats engine
- M8: Charts + dashboard (Chart.js or Recharts)
- M9: Story-style animated cards (Framer Motion)
- M10: Cross-platform insights (digital-day heatmap, taste-over-time, etc.)
- M11: Shareable summary image, guided export instructions page, privacy toggles, PWA, polish

## Decisions

- 2026-10-13: Building "Footprint" (multi-platform "year in review" app)
  instead of the class-notes organizer discussed earlier this session.
  Haoran came in with a fully-specified brief for this idea and chose to go
  with it.
- 2026-10-13: Platform = web app, following directly from the tech stack
  (Vite + React, static hosting on GitHub Pages) and the no-backend design;
  also the easiest for a classmate to try, since it's just a link.
- 2026-10-13: JavaScript, not TypeScript — Haoran's choice, to keep things
  simpler while learning.
- 2026-10-13: No backend/database server and no paid APIs. All parsing runs
  client-side (a Web Worker handles large files so the UI doesn't freeze),
  and data is stored locally via Dexie (IndexedDB). This is both a $0-budget
  constraint and the app's core privacy premise.
- 2026-10-13: Architecture rule: one parser module per platform
  (`/src/parsers/youtubeJson.js`, `youtubeHtml.js`, `spotify.js`, ...), each
  converting that platform's export into one unified event format
  (`{ id, platform, type, timestamp, title, creator, durationMs, extra }`).
  All stats/charts/cards read only the unified events, never raw platform
  data — so adding a new platform later only requires a new parser file.
- 2026-10-13: Collaboration style = Explained (see CLAUDE.md, Student
  Preferences).
- 2026-10-15: YouTube parser handles both JSON and HTML export formats,
  not just JSON. Discovered Google defaults to HTML (JSON requires an
  explicit "Multiple formats" choice in Takeout most people won't see)
  when Haoran's real export came back as HTML — see Problems. HTML
  parsing uses the browser's real `DOMParser` rather than regex/string
  matching, since the HTML structure is undocumented and reverse
  engineered from the real file.
- 2026-10-19: Deploying from a second, personal repo
  (`github.com/ABLAILAILAI/footprint`) instead of the
  `cs124-illinois-students` org repo. The course instructor (Challen)
  said on Ed he won't enable GitHub Pages on the course org for
  security/policy reasons, but said pushing to a different remote to
  deploy from is fine. The `cs124-illinois-students` repo (`origin`)
  stays the one used for grading/history as always. Changed
  `vite.config.js`'s `base` path from
  `/Project-Fall2026-ABLAILAILAI-104703804/` to `/footprint/` to match
  the new repo's name. Publishing to the public repo is done only via
  `scripts/deploy-public.sh`, never a direct `git push` from this repo
  — see Problems for why.

## Problems

- 2026-10-19: Setting up the public deploy repo, Claude mirror-pushed this
  repo's full git history (`git push pages main`) without realizing that
  also carried `.claude-sessions/` (full session transcripts) and
  `.claude/settings.json` (a personal reporting link) onto a **public**
  repo — this repo is private, so that distinction hadn't mattered until
  the first push to a public one. Caught within the same session by
  checking what actually got pushed. Fixed by replacing that history with
  a clean snapshot built in a separate, throwaway git repo containing
  only the app files (`scripts/deploy-public.sh` now does this
  automatically; README updated to require using it instead of pushing
  directly). Important caveat: force-pushing a replacement history
  doesn't guarantee the originally-pushed data is unrecoverable — GitHub
  doesn't instantly delete old commits, and anything scraping public
  GitHub activity in real time could have already captured it during the
  brief window it was public. Haoran should check with course staff
  whether the reporting link in `.claude/settings.json` can/should be
  rotated as a precaution.
- 2026-10-15: Haoran's real Google Takeout export for YouTube came back
  as HTML (`search-history.html`), not the JSON the parser was first
  built against — Google's default export format is HTML; JSON needs an
  explicit setting change in Takeout most people won't make. Fixed by
  building a second parser (`youtubeHtml.js`) for the real format,
  rather than assuming everyone will pick JSON. Also, inspecting the
  real file revealed ~8.8% of entries (484 of 5517) were ad impressions
  formatted exactly like genuine watches (only distinguishable by a
  hidden "From Google Ads" detail) — the original JSON parser's
  fabricated test data hadn't modeled this, so it was silently missing
  this case too; fixed in both parsers. Lesson: build sample test data
  from real exports whenever possible, not just from documentation.
- 2026-10-13: Couldn't enable GitHub Pages on the `cs124-illinois-students`
  org repo — 404 on `.../settings/pages` for both Haoran and Claude's `gh`
  token (no admin access). Resolved 2026-10-19: this was intentional, not
  a missing permission — the instructor won't allow Pages on the course
  org at all, for security/policy reasons. Deploying from a second
  personal repo instead (see Decisions). The deploy job in this repo's
  own `.github/workflows/deploy.yml` will keep failing here forever —
  that's expected, not a bug to chase.
