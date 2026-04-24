# Telematics (Bouncie) — Go-Live Checklist

The Telematics feature is fully wired end-to-end (DB, OAuth, webhook, cron,
dashboard UI, feature-flag gating, unit + E2E tests). It is behind the
`bouncie_telematics` feature flag and only shows up for Pro/Max tenants.

Netlify production currently has **placeholder** values for the four
`BOUNCIE_*` env vars. Nothing will actually talk to Bouncie until these are
replaced with real credentials from the Bouncie developer portal.

This checklist captures everything that must happen once those creds arrive.

## Pre-launch

- [ ] Create app in Bouncie developer portal (https://developer.bouncie.com/).
- [ ] Record `client_id`, `client_secret`, generate a webhook HMAC secret.
- [ ] Register redirect URI in the Bouncie dev portal:
      `https://epuredrive.com/api/telematics/oauth/callback`
- [ ] Register webhook URL in the Bouncie dev portal:
      `https://epuredrive.com/api/telematics/webhook/bouncie`

## Netlify env vars (replace placeholders)

Currently set to `placeholder` — replace with real values from the Bouncie
dev portal. Use the pattern from `CLAUDE.md`:

```bash
TOKEN=$(grep NETLIFY_TOKEN .env.local | cut -d= -f2-)
curl -s -X PATCH "https://api.netlify.com/api/v1/accounts/ayrtonl/env/BOUNCIE_CLIENT_ID?site_id=aca8175e-457e-4e87-b38b-1c5ca1e03dc8" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"values":[{"value":"REAL_VALUE","context":"all"}]}'
# Repeat for BOUNCIE_CLIENT_SECRET, BOUNCIE_WEBHOOK_SECRET
# BOUNCIE_REDIRECT_URI is already correct — no change needed
```

- [ ] `BOUNCIE_CLIENT_ID` replaced with real value
- [ ] `BOUNCIE_CLIENT_SECRET` replaced with real value
- [ ] `BOUNCIE_WEBHOOK_SECRET` replaced with real value
- [ ] `BOUNCIE_REDIRECT_URI` is `https://epuredrive.com/api/telematics/oauth/callback` (already set)
- [ ] Trigger a Netlify redeploy so new vars are picked up

## Smoke test (after real creds are live)

- [ ] `/dashboard/telematics` is gated — a Free tenant is redirected to
      `/dashboard/settings/billing?upgrade=telematics` with the amber banner.
- [ ] Upgrade a test tenant to Pro via Stripe → sidebar now shows the
      Telematics group and the Integrations → Bouncie item.
- [ ] Click "Connect Bouncie" → OAuth completes on the real Bouncie domain
      → user is returned to `/dashboard/telematics/devices` with the
      tenant's Bouncie vehicles listed.
- [ ] Pair a physical dongle to a real vehicle in the Bouncie app.
- [ ] Verify first webhook event arrives in `telematics_events` within
      ~2 minutes of driving (check Supabase logs + row count).
- [ ] Verify `telematics_positions` rows appear as the vehicle moves.
- [ ] Verify `cars.mileage`, `cars.last_lat`, `cars.last_lon`,
      `cars.last_seen_at` update from telemetry.
- [ ] Trigger a `speed_exceeded` event (drive over the geofence speed
      limit) → confirm:
      - [ ] Row appears in `telematics_events` with severity >= warning
      - [ ] Notification bell in dashboard header increments
      - [ ] Email notification is sent to opted-in admins
- [ ] Verify Netlify scheduled functions in the dashboard:
      - [ ] `telematics-sync` runs every 5 minutes
      - [ ] `telematics-prune` runs daily at 03:00 UTC
- [ ] Disconnect from `/dashboard/integrations/bouncie` → row in
      `telematics_connections` flips to `status='disconnected'` and
      sidebar stops polling.

## Rollback plan

If something breaks post-launch:

1. Flip the feature flag off for all tenants:
   ```sql
   UPDATE tenants SET feature_flags = feature_flags - 'bouncie_telematics';
   ```
2. Or set it explicitly false per tenant.
3. Revoke the Netlify env vars (replace values with `placeholder`) so
   OAuth + webhook routes fail closed.
4. The dashboard UI remains intact but every gated route redirects to
   billing — no user-facing 500s.

## References

- Plan: `docs/superpowers/plans/2026-04-23-telematics-bouncie.md`
- Spec: `docs/superpowers/specs/2026-04-23-telematics-bouncie-design.md`
- E2E: `e2e/telematics-connect.spec.ts`, `e2e/telematics-gating.spec.ts`
- Unit tests: `__tests__/telematics/` (49 tests, all green)
