#!/usr/bin/env bash
# PreToolUse guard for Bash commands.
# Blocks operations that plain prefix-based permission rules can't catch:
#   - destructive raw SQL (DROP/TRUNCATE/DELETE without WHERE) via a DB CLI
#   - deleting Netlify env vars via the API (must update in place, never delete)
set -euo pipefail

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')

if [ -z "$cmd" ]; then
  printf '{}'
  exit 0
fi

deny() {
  reason=$1
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":%s}}' "$(printf '%s' "$reason" | jq -Rs .)"
  exit 0
}

# Netlify env var deletion (DELETE method against an /env endpoint)
if printf '%s' "$cmd" | grep -qiE 'netlify\.com/api/v1/(accounts|sites)/[^ ]*/env' \
  && printf '%s' "$cmd" | grep -qiE -- '-X[[:space:]]*DELETE'; then
  deny "Blocked: deleting Netlify env vars is against project policy (see CLAUDE.md / feedback_never_delete_prod_env memory — this has caused prod outages twice). Update the value in place with a POST instead."
fi

# Raw destructive SQL via a DB CLI
if printf '%s' "$cmd" | grep -qiE '\b(psql|mysql|sqlite3|supabase[[:space:]]+db)\b'; then
  if printf '%s' "$cmd" | grep -qiE '\bDROP[[:space:]]+(TABLE|DATABASE|SCHEMA)\b|\bTRUNCATE\b'; then
    deny "Blocked: raw DROP/TRUNCATE via a DB CLI is not allowed. Use a reviewed migration (mcp Supabase apply_migration) or ask the user to confirm explicitly."
  fi
  if printf '%s' "$cmd" | grep -qiE '\bDELETE[[:space:]]+FROM\b' \
    && ! printf '%s' "$cmd" | grep -qiE '\bWHERE\b'; then
    deny "Blocked: DELETE without a WHERE clause via a DB CLI. Add a WHERE clause or run it through Supabase MCP execute_sql with explicit confirmation."
  fi
fi

printf '{}'
