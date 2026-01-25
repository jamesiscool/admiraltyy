#!/usr/bin/env bash
set -euo pipefail

# Usage: ./ralph.sh [max_iterations]
MAX_ITERATIONS=${1:-3}
COMPLETE_FLAG="ralph_complete"

for i in $(seq 1 "$MAX_ITERATIONS"); do
  # Exit if we've created the completion flag
  if [[ -f "$COMPLETE_FLAG" ]]; then
    echo "All tasks are now complete (found $COMPLETE_FLAG). Exiting."
    exit 0
  fi

  claude --dangerously-skip-permissions < <(cat prompt.md; echo -e "")

  # If the agent made changes, commit them (agent may already commit; this is a safety step)
  if [[ -n "$(git status --porcelain)" ]]; then
    git add -A
    git commit -m "Ralph: automated changes (iteration $i)"
  fi

  # Print progress
  echo "Completed iteration $i"
done

echo "Reached maximum iterations ($MAX_ITERATIONS). Exiting."
exit 0


 #trap 'exit 0' INT; for i in {1..10}; do cat prompt.md | claude --dangerously-skip-permissions; done
