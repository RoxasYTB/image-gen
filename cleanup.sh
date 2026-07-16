#!/bin/bash
# Nettoyage horaire - core dumps, logs, caches
# Execute en cron user (pas besoin de root)

HOME_DIR=/home/ysannier
LOGFILE="$HOME_DIR/.cleanup-disk.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOGFILE"
}

exec > >(tee -a "$LOGFILE") 2>&1

echo "=== Cleanup $(date) ==="

# 1. Core dumps (>10M)
total_freed=0
while read -r f; do
  s=$(stat -c%s "$f" 2>/dev/null || echo 0)
  rm -f "$f"
  total_freed=$((total_freed + s))
  echo "  supprime $f ($((s/1024/1024)) MB)"
done < <(find "$HOME_DIR" -maxdepth 3 -name 'core.*' -size +1M 2>/dev/null)

# 2. Logs > 100M (les tronquer)
while read -r f; do
  s=$(stat -c%s "$f" 2>/dev/null || echo 0)
  truncate -s 0 "$f"
  echo "  tronque $f ($((s/1024/1024)) MB)"
  total_freed=$((total_freed + s))
done < <(find "$HOME_DIR" -name '*.log' -size +100M 2>/dev/null)

# 3. Caches node_modules/.cache
while read -r d; do
  s=$(du -sb "$d" 2>/dev/null | cut -f1)
  rm -rf "${d:?}"/* 2>/dev/null
  echo "  vide $d ($((s/1024/1024)) MB)"
  total_freed=$((total_freed + s))
done < <(find "$HOME_DIR" -path '*/node_modules/.cache' -type d 2>/dev/null)

# 4. Caches npm/pnpm/bun
rm -rf "$HOME_DIR/.npm/_cacache" 2>/dev/null

if [ "$total_freed" -gt 0 ]; then
  echo " Libere $((total_freed/1024/1024)) MB"
else
  echo " Rien a nettoyer"
fi

df -h / | tail -1
echo "=== Fin cleanup ==="
