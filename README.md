# Footprint

A privacy-first web app that turns your own data exports from platforms like
YouTube, Spotify, Netflix, and Instagram into an animated "year in review"
report. Everything runs in the browser — nothing is ever uploaded anywhere.

## Development

```bash
npm install
npm run dev
```

Opens the app locally with hot reload.

## Build

```bash
npm run build
npm run preview
```

`npm run build` outputs a static site to `dist/`. `npm run preview` serves
that build locally so you can check it before deploying.

## Deploy

The course org (`cs124-illinois-students`) doesn't allow GitHub Pages, so
this deploys from a separate personal repo instead:
[github.com/ABLAILAILAI/footprint](https://github.com/ABLAILAILAI/footprint).

Pushing to that repo's `main` branch automatically builds and deploys to
GitHub Pages via the workflow in `.github/workflows/deploy.yml`.

**Do not `git push` there directly from this repo.** This repo's
pre-commit hook always re-adds `.claude-sessions/` (by design, for course
grading), so a normal commit here can't cleanly exclude it — and that
directory, plus `.claude/` (which holds a personal reporting link), must
never end up on the public repo. Use the script instead, which builds a
clean copy with its own throwaway git history and pushes only that:

```bash
./scripts/deploy-public.sh
```

Live at: https://ablailailai.github.io/footprint/
