# éPure Drive — Rental App

JavaScript/HTML web application (rental car dashboard + public-facing fleet site).
Backend: Supabase (PostgreSQL). Hosting: Netlify. Always push to `main` so changes go live immediately.

## Skills

The `/brainstorm` skill (`superpowers:brainstorm`) is deprecated and will be removed in the next major release. When brainstorming is needed, invoke `superpowers:brainstorming` instead.

This repo also has project-local Skills under `.claude/skills/` — invoke them (or let them auto-load) for the recurring procedures below instead of re-deriving them from prose:
- `supabase-schema-check` — before any INSERT/UPDATE
- `notion-devlog` — after finishing any task
- `verify-before-done` — after fixing calculation/matching/rendering bugs

## Worktrees

For risky or long-running changes you want isolated from the current branch (e.g. a schema migration, a multi-file refactor, or parallel work on two features), use Claude Code's native worktree support (`--worktree <name>` or the `EnterWorktree` tool) rather than working directly on `main`. Worktrees land under `.claude/worktrees/`; `node_modules` and `.next` are symlinked from the main checkout (see `.claude/settings.json`) so each worktree doesn't reinstall dependencies. Small in-flight edits (a few files, actively being iterated on) don't need this — reserve it for changes where you'd otherwise be nervous about `main` being in a half-done state.

## Database

This app uses Supabase (PostgreSQL). Before writing any INSERT or UPDATE query:
- Check NOT NULL constraints and required fields for the target table
- Verify column names via `information_schema.columns` if unsure
- Test writes with realistic data that matches production values (e.g. actual car IDs, valid dates)
- Never assume a column is optional — consult the schema first

## Data & Rendering

When fixing rendering logic, always verify against actual DB data:
- Do not assume static/hardcoded values are correct — query the DB to confirm
- After a fix, trace the full data flow: DB → JS → DOM to confirm it reaches the UI
- Scan nearby code for similar stale or hardcoded patterns when fixing one instance
- The `cars` table is the single source of truth for public fleet data; the static `CARS` array in `fleet.js` is only a fallback

## Notion Updates (MANDATORY)

After completing any task, feature, fix, or meaningful change, log it in the correct Notion page. Use the Notion MCP tools directly (`mcp__claude_ai_Notion__notion-fetch`, `mcp__claude_ai_Notion__notion-update-page`, `mcp__claude_ai_Notion__notion-create-pages`).

### Where to log by type of work

| Type of work | Notion page |
|---|---|
| Code changes, bug fixes, new features, UI work | [Dev Log — Changelog](https://app.notion.com/34142609acfe81318e2cd64751dc48fe) — add entry with date, files, and status |
| Active feature in development | [Active Projects](https://www.notion.so/33a42609acfe8122ba7af19c3ef0f03c) — update status or add new project block |
| Pre-launch blockers or checklist items | [Pre-Launch Checklist — Go Live Q2 2026](https://www.notion.so/33d42609acfe8119b0e1f366d911339e) — mark done or update status |
| Marketing / landing page / copy changes | [Sales & Marketing](https://www.notion.so/33a42609acfe81d2acf0fc53acc843c8) |
| Infra, DNS, Netlify, Supabase ops | [Operations](https://www.notion.so/33a42609acfe816e8c70f0ab8d3b55f1) |
| Billing, Stripe, revenue | [Finance](https://www.notion.so/33a42609acfe81f48a50c636a0abd89c) |

### Rules
- Always add to the Dev Log regardless of the type (it's the master record)
- Update Active Projects status when a task moves forward or is completed
- If work touches a Pre-Launch item, mark it done in the checklist too
- This applies to all sessions — no exceptions
- **Do NOT ask for authorization before updating Notion — just do it automatically at the end of every session**

## Netlify

Claude tiene acceso directo a la API de Netlify vía `NETLIFY_TOKEN` en `.env.local`.
- Site ID: `aca8175e-457e-4e87-b38b-1c5ca1e03dc8`
- Account slug: `ayrtonl`

Para agregar/modificar env vars en producción:
```bash
curl -s -X POST "https://api.netlify.com/api/v1/accounts/ayrtonl/env" \
  -H "Authorization: Bearer $(grep NETLIFY_TOKEN .env.local | cut -d= -f2-)" \
  -H "Content-Type: application/json" \
  -d '[{"key":"VAR_NAME","values":[{"value":"val","context":"all"}],"site_id":"aca8175e-457e-4e87-b38b-1c5ca1e03dc8"}]'
```

Después de agregar variables, hacer redeploy si es necesario. Claude debe manejar Netlify de forma autónoma sin pedir confirmación al usuario.

## Stripe

Claude has direct Stripe API access via `STRIPE_SECRET_KEY` in `.env.local`. For any Stripe operation (create products, prices, coupons, etc.) use curl against the Stripe API — do NOT ask the user to do it manually.

```bash
curl https://api.stripe.com/v1/products \
  -u "$(grep STRIPE_SECRET_KEY .env.local | cut -d= -f2-):"
```

### Known Price IDs (live mode)
| Plan | Price ID |
|---|---|
| Starter | `price_1TDaQ3HAH4zJnnwfasGBYtYO` |
| Pro | `price_1TOeR2HAH4zJnnwfoIUGUERS` ($19/mo) |
| Max | `price_1TOeR5HAH4zJnnwftxKqDqG2` ($39/mo) |

After creating a new price, always:
1. Add it to `.env.local` as `STRIPE_PRICE_<PLAN>=...`
2. Add the fallback hardcoded in `app/api/stripe/webhook/route.ts`
3. Add to the table above in this file

## Testing & Verification

After fixing bugs in calculation or matching logic:
- Verify with at least 2–3 different data scenarios (e.g. different car IDs, date ranges, customer records)
- For DB changes, run a SELECT after the INSERT/UPDATE to confirm the data looks right
- For UI rendering bugs, check the browser console and the DOM element directly
- Use the Supabase MCP (`mcp__claude_ai_Supabase__execute_sql`) to run quick verification queries

### Completion report

For any DB migration, Netlify env/deploy change, or Stripe operation, close it out with this instead of just "done":
```
STATUS: complete / partial / blocked
CHANGED: files/tables/env vars touched
VERIFIED: exact scenarios checked (see verify-before-done) + their results
NOT TESTED: anything left unverified
```
