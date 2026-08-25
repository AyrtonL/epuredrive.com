---
name: verify-before-done
description: Use after fixing a calculation, matching, or overlap-detection bug, or any rendering bug tied to DB data, before reporting the fix as complete
---

# Verify Before Done

## Overview
A fix that passes on the one case you had in mind isn't verified — it's a guess that happened to work once. This project has shipped calculation/matching bugs before because a fix was checked against a single scenario. Prove it across a few different real inputs instead.

## When to Use
- After fixing logic in reservations/overlap/pricing/availability calculations.
- After fixing a matching or dedup bug (e.g. duplicate reservation detection, Turo sync dedup).
- After fixing a rendering bug where the UI showed stale or wrong data.
- Before writing a completion report or telling the user "fixed."

## Steps
1. **Pick 2–3 distinct real scenarios** — different car IDs, different date ranges, different customer records. Not variations of the same case with one field changed.
2. **For DB writes:** run the `INSERT`/`UPDATE`, then `SELECT` the row back and check the actual values, not just that the query didn't error.
3. **For calculation/matching logic:** trace the specific inputs through the new logic by hand for each scenario and confirm the output matches what should happen — e.g. "Andrew returns the car 2 hours before the next booking starts → not an overlap" is exactly the kind of edge case that needs its own explicit scenario, not an inference from the general rule.
4. **For UI rendering bugs:** open the browser console and inspect the actual DOM element/network response — don't infer from the code that it must be fixed.
5. Only after 2–3 scenarios pass, report the fix as verified — name the scenarios you checked, not just "tested and works."

## Common Mistakes
- Testing only the exact case reported by the user and calling it done — the same bug class often has a sibling edge case (e.g. same-day back-to-back bookings, buffer windows) that the single test doesn't touch.
- Trusting "no error thrown" as proof for a DB write instead of reading the row back.
- Reasoning about a UI fix from the source code alone when the actual bug was in how stale/cached data reached the DOM — check `cars` table vs. the static `CARS` fallback array in `fleet.js` when in doubt (see project CLAUDE.md, Data & Rendering).
