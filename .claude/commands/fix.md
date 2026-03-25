# Fix Bug Skill

Follow these steps in order when fixing any bug in this rental app:

1. **Read relevant source files and DB schema** — identify which table(s) and JS files are involved
2. **Check NOT NULL constraints and required fields** — query `information_schema.columns` or use the Supabase MCP before writing any INSERT/UPDATE
3. **Implement the fix** — make targeted, minimal changes
4. **Verify with real data** — run a query or check the DOM with at least 2–3 different scenarios (different car IDs, date ranges, customers)
5. **Check for similar hardcoded/stale values nearby** — scan adjacent code for the same pattern
