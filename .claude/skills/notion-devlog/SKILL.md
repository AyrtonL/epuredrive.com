---
name: notion-devlog
description: Use when finishing any task, feature, fix, or meaningful change in this repo — after the code/verification work is done, before ending the session
---

# Notion Dev Log

## Overview
Every completed task in this project gets logged in Notion, automatically, without asking for authorization first. This is a standing rule (see project CLAUDE.md), not optional cleanup.

## When to Use
At the end of any task that changed code, fixed a bug, shipped a feature, touched infra/DNS/Netlify/Supabase, changed pricing/Stripe, or changed marketing copy.

## Routing table

| Type of work | Notion page |
|---|---|
| Code changes, bug fixes, features, UI work | Dev Log — Changelog (always, regardless of type — it's the master record) |
| Active feature in development | Active Projects — update status or add block |
| Pre-launch blockers/checklist items | Pre-Launch Checklist — Go Live Q2 2026 |
| Marketing / landing page / copy | Sales & Marketing |
| Infra, DNS, Netlify, Supabase ops | Operations |
| Billing, Stripe, revenue | Finance |

Exact page URLs live in `CLAUDE.md` under "Notion Updates (MANDATORY)" — fetch from there, don't hardcode a stale link here.

## Steps
1. Identify which row(s) of the table above the work touches. Most tasks touch at least the Dev Log.
2. Use `mcp__claude_ai_Notion__notion-fetch` to pull the target page, `notion-update-page` or `notion-create-pages` to add the entry.
3. Dev Log entry needs: date, files/areas touched, and status (done / in progress / blocked).
4. If the task also moved a Pre-Launch checklist item, mark it done there too — don't leave it only in the Dev Log.
5. Do this automatically at the end of the session. Do not ask the user for permission first — that's already been granted project-wide.

## Common Mistakes
- Logging only to Dev Log when the work also affects Active Projects status or a Pre-Launch item — update all applicable pages, not just one.
- Waiting to be asked. The rule is unconditional: log it at the end of every session that did meaningful work.
- Writing a vague entry ("fixed stuff") instead of naming the actual files/behavior changed — future sessions rely on this log for context.
