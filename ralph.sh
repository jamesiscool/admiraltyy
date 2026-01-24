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
  > "$TMPFILE"  # Clear temp file
  script -q -c "cat '$DIR/prompt.md' | claude --dangerously-skip-permissions" "$TMPFILE" &
  SCRIPT_PID=$!
  
  sleep 5  # Wait for claude to initialize before monitoring
  
  # Monitor for completion marker, kill when found
  while kill -0 $SCRIPT_PID 2>/dev/null; do
    if [[ $(grep -c '<promise>COMPLETE</promise>' "$TMPFILE" 2>/dev/null) -ge 2 ]]; then
      kill $SCRIPT_PID 2>/dev/null
      wait $SCRIPT_PID 2>/dev/null
      echo "✅ Done!"
      exit 0
    fi
    sleep 1
  done
  wait $SCRIPT_PID 2>/dev/null
done

echo "⚠️ Max iterations"
exit 1


 #trap 'exit 0' INT; for i in {1..10}; do cat prompt.md | claude --dangerously-skip-permissions; done
