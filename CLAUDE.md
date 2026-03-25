# éPure Drive — Rental App

JavaScript/HTML web application (rental car dashboard + public-facing fleet site).
Backend: Supabase (PostgreSQL). Hosting: Netlify. Always push to `main` so changes go live immediately.

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

## Testing & Verification

After fixing bugs in calculation or matching logic:
- Verify with at least 2–3 different data scenarios (e.g. different car IDs, date ranges, customer records)
- For DB changes, run a SELECT after the INSERT/UPDATE to confirm the data looks right
- For UI rendering bugs, check the browser console and the DOM element directly
- Use the Supabase MCP (`mcp__claude_ai_Supabase__execute_sql`) to run quick verification queries
