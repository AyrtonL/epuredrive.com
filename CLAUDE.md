# éPure Drive — Rental App

JavaScript/HTML web application (rental car dashboard + public-facing fleet site).
Backend: Supabase (PostgreSQL). Hosting: Netlify. Always push to `main` so changes go live immediately.

## Skills

The `/brainstorm` skill (`superpowers:brainstorm`) is deprecated and will be removed in the next major release. When brainstorming is needed, invoke `superpowers:brainstorming` instead.

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
| Pro | `price_1TF2UnHAH4zJnnwfTwU129PO` |
| Max | `price_1TMBzWHAH4zJnnwf9xd3BxGL` |

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
