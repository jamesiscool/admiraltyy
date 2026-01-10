#!/bin/bash

# Exit codes
POSTPROCESS_SUCCESS=93
POSTPROCESS_ERROR=94
POSTPROCESS_NONE=95

# Get API URL from options (with default fallback)
API_URL="${NZBPO_APIURL:-http://localhost:2829}"

echo "[INFO] Notifying Admiraltyy at ${API_URL}"

# Call sync endpoint
RESPONSE=$(curl -s -X POST "${API_URL}/api/activity/nzbget/sync" \
  -H "Content-Type: application/json" \
  -w "\n%{http_code}" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "[INFO] Sync successful: ${BODY}"
  exit $POSTPROCESS_SUCCESS
else
  echo "[ERROR] Sync failed (HTTP ${HTTP_CODE}): ${BODY}"
  exit $POSTPROCESS_ERROR
fi
