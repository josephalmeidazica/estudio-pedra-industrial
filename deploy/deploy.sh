#!/usr/bin/env bash
# Pull the latest code, rebuild, and (re)start the app under pm2.
# Run on the VPS:  bash deploy/deploy.sh
#
# Preserves .data/ (SQLite database + uploaded images) across deploys.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> git pull"
git pull --ff-only

echo "==> npm ci"
npm ci

echo "==> npm run build"
npm run build

if pm2 describe eps >/dev/null 2>&1; then
  echo "==> pm2 restart eps"
  pm2 restart eps
else
  echo "==> pm2 start (first run)"
  pm2 start deploy/ecosystem.config.cjs
  pm2 save
fi

pm2 status
echo "Done. Data in .data/ was preserved."
