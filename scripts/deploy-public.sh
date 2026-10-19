#!/usr/bin/env bash
# Publishes the app to the public deploy repo (github.com/ABLAILAILAI/footprint),
# which exists only because the cs124-illinois-students org doesn't allow
# GitHub Pages. See PLAN.md (2026-10-19) for why this script exists instead
# of a normal `git push`.
#
# This repo's own .githooks/pre-commit hook always re-adds .claude-sessions/
# to any commit (by design, for course grading) — including a commit meant
# only for the public mirror. A plain `git push <remote> main` from here
# would carry that, plus .claude/ (which holds a personal reporting link),
# straight onto a public repo. So instead of committing in this repo at all,
# this script copies just the app files into a throwaway directory with its
# own fresh, hookless git history and pushes only that.
set -euo pipefail

DEPLOY_REPO="https://github.com/ABLAILAILAI/footprint.git"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

rsync -a \
  --exclude='.git' \
  --exclude='.claude' \
  --exclude='.claude-sessions' \
  --exclude='.githooks' \
  --exclude='node_modules' \
  --exclude='dist' \
  "$REPO_ROOT"/ "$TMP_DIR"/

cd "$TMP_DIR"
git init -q
git add -A
git commit -q -m "Deploy snapshot: Footprint app only (no course reporting/session internals)"
git push --force "$DEPLOY_REPO" HEAD:main

echo "Deployed to $DEPLOY_REPO"
