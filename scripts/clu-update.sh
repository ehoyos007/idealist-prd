#!/usr/bin/env bash
# =============================================================================
# clu-update.sh — Clu's session commit workflow for idealist-prd
#
# Usage:
#   ./scripts/clu-update.sh "Brief summary of what was done"
#   ./scripts/clu-update.sh "Fixed auth bug + updated deps" --no-push
#
# What it does:
#   1. Stamps PROGRESS.md with a session entry (timestamp + summary)
#   2. Runs git add -A
#   3. Commits with "clu: <summary>"
#   4. Pushes to origin/main (unless --no-push)
# =============================================================================

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROGRESS_FILE="$REPO_DIR/PROGRESS.md"
PUSH=true

# Parse args
SUMMARY="${1:-}"
shift || true
for arg in "$@"; do
  [[ "$arg" == "--no-push" ]] && PUSH=false
done

if [[ -z "$SUMMARY" ]]; then
  echo "❌ Usage: ./scripts/clu-update.sh \"Summary of changes\" [--no-push]"
  exit 1
fi

cd "$REPO_DIR"

# Check for any changes (staged, unstaged, or untracked)
if git diff --quiet && git diff --cached --quiet && [[ -z "$(git ls-files --others --exclude-standard)" ]]; then
  CHANGES_EXIST=false
else
  CHANGES_EXIST=true
fi

TIMESTAMP="$(date '+%Y-%m-%d %H:%M %Z')"
DATE_ONLY="$(date '+%Y-%m-%d')"

# Stamp PROGRESS.md — insert new entry after the first heading
ENTRY="## Clu Session: $DATE_ONLY\n\n**Summary:** $SUMMARY\n\n---\n"

# Insert after line 1 (the # heading)
if [[ -f "$PROGRESS_FILE" ]]; then
  FIRST_LINE="$(head -1 "$PROGRESS_FILE")"
  REST="$(tail -n +2 "$PROGRESS_FILE")"
  printf '%s\n\n%b%s' "$FIRST_LINE" "$ENTRY" "$REST" > "$PROGRESS_FILE"
  echo "✅ Stamped PROGRESS.md"
else
  echo "# Progress Log" > "$PROGRESS_FILE"
  printf '\n%b' "$ENTRY" >> "$PROGRESS_FILE"
  echo "✅ Created PROGRESS.md"
fi

# Stage everything
git add -A
echo "✅ Staged all changes"

# Check if there's actually anything to commit
if git diff --cached --quiet; then
  echo "ℹ️  Nothing to commit (only PROGRESS.md was modified and it's already clean)"
  # Stage PROGRESS.md explicitly
  git add "$PROGRESS_FILE" 2>/dev/null || true
fi

# Commit
COMMIT_MSG="clu: $SUMMARY"
git commit -m "$COMMIT_MSG" || {
  echo "⚠️  Nothing new to commit — already up to date"
  exit 0
}
echo "✅ Committed: \"$COMMIT_MSG\""

# Push
if [[ "$PUSH" == true ]]; then
  git push origin main
  echo "✅ Pushed to origin/main"
else
  echo "ℹ️  Skipped push (--no-push)"
fi

echo ""
echo "🟠 Clu update complete — $TIMESTAMP"
echo "   \"$SUMMARY\""
