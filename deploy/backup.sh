#!/usr/bin/env bash
# Back up everything the app persists (the whole .data/ dir: SQLite db + uploads).
# Usage:  bash deploy/backup.sh [dest-dir]     (default dest: $HOME)
#
# 1. Writes <dest>/eps-backup-<timestamp>.tgz
# 2. If an rclone remote named "eps-backup" exists (see DEPLOY.md step 7),
#    copies the archive to eps-backup:eps-backups/ and prunes remote archives
#    older than 30 days. Without the remote this step is skipped, loudly.
# 3. Keeps only the 7 newest local archives.
#
# Schedule daily with cron, e.g.
#   0 3 * * * /bin/bash /opt/estudio-pedra-industrial/deploy/backup.sh /var/backups/eps >> /var/log/eps-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."

dest="${1:-$HOME}"
mkdir -p "$dest"
out="$dest/eps-backup-$(date +%F-%H%M%S).tgz"

if [ ! -d .data ]; then
  echo "No .data/ directory yet - nothing to back up (has the app run once?)." >&2
  exit 1
fi

tar czf "$out" .data
echo "Backup written: $out"

REMOTE="eps-backup"
if command -v rclone >/dev/null 2>&1 && rclone listremotes 2>/dev/null | grep -qx "${REMOTE}:"; then
  rclone copy "$out" "${REMOTE}:eps-backups/"
  rclone delete --min-age 30d "${REMOTE}:eps-backups/" || true
  echo "Copied to ${REMOTE}:eps-backups/ and pruned remote archives older than 30 days."
else
  echo "rclone remote '${REMOTE}' not configured - skipping off-box copy."
fi

# Keep the 7 newest local archives.
ls -1t "$dest"/eps-backup-*.tgz 2>/dev/null | tail -n +8 | xargs -r rm -f
