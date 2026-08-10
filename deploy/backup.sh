#!/usr/bin/env bash
# Back up everything the app persists (the whole .data/ dir: SQLite db + uploads).
# Usage:  bash deploy/backup.sh [dest-dir]     (default dest: $HOME)
#
# Tip: schedule daily with cron, e.g.
#   0 3 * * * /bin/bash /opt/estudio-pedra-industrial/deploy/backup.sh /var/backups/eps
set -euo pipefail

cd "$(dirname "$0")/.."

dest="${1:-$HOME}"
mkdir -p "$dest"
out="$dest/eps-backup-$(date +%F-%H%M%S).tgz"

if [ ! -d .data ]; then
  echo "No .data/ directory yet — nothing to back up (has the app run once?)." >&2
  exit 1
fi

tar czf "$out" .data
echo "Backup written: $out"
