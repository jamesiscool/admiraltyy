#!/bin/bash
set -e

TMPFILE=$(mktemp)
cleanup() { rm -f "$TMPFILE"; }
trap 'cleanup; echo " Cancelled"; exit 130' INT
trap cleanup EXIT

MAX=${1:-10}
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for ((i=1; i<=MAX; i++)); do
  echo "═══ Iteration $i/$MAX ═══"
  script -q -c "cat '$DIR/prompt.md' | claude --dangerously-skip-permissions" "$TMPFILE"
  grep -q '<promise>COMPLETE</promise>' "$TMPFILE" && echo "✅ Done!" && exit 0
done

echo "⚠️ Max iterations"
exit 1


 #trap 'exit 0' INT; while :; do cat prompt.md | claude --dangerously-skip-permissions; done
