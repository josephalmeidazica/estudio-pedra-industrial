#!/usr/bin/env bash
# Restore .data/ (SQLite db + uploads) from an archive made by deploy/backup.sh.
# Usage:  bash deploy/restore.sh <path/to/eps-backup-*.tgz>
#
# - Stops the pm2 app "eps" if pm2 is installed and the app exists.
# - Moves the current .data/ aside as .data.before-restore-<timestamp>/
#   (nothing is deleted; remove that folder yourself once you are happy).
# - Extracts the archive, then starts the app again if it was stopped.
# Also runs on a dev machine without pm2 (e.g. Git Bash on Windows).
set -euo pipefail

archive="${1:?usage: bash deploy/restore.sh <eps-backup-*.tgz>}"
[ -f "$archive" ] || { echo "No such file: $archive" >&2; exit 1; }
archive="$(readlink -f "$archive")"

cd "$(dirname "$0")/.."

has_pm2() { command -v pm2 >/dev/null 2>&1 && pm2 describe eps >/dev/null 2>&1; }

stopped=0
if has_pm2; then
  echo "==> pm2 stop eps"
  pm2 stop eps
  stopped=1
fi

if [ -d .data ]; then
  aside=".data.before-restore-$(date +%F-%H%M%S)"
  mv .data "$aside"
  echo "Previous data moved to $aside/"
fi

tar xzf "$archive"

if [ "$stopped" = 1 ]; then
  echo "==> pm2 start eps"
  pm2 start eps
fi

echo "Restored .data/ from $archive"
