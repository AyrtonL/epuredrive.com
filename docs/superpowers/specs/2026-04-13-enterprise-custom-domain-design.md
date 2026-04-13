# Enterprise Custom Domain — Design Spec
**Date:** 2026-04-13
**Status:** Approved
**Scope:** Custom domain support for Enterprise tenants — manual activation at go-live, self-serve in Phase 2

---

## Context

éPure Drive tenants on all plans get a free subdomain: `slug.epuredrive.com`.
Enterprise tenants can additionally point their own domain (e.g., `fleet.yourbrand.com`) to their fleet page.

This feature is **Enterprise-only**. Activation is manual at go-live (admin assigns plan + domain in DB + Netlify). Self-serve flow is deferred to Phase 2.

---

## Pricing

| Concept | Amount |
|---|---|
| Setup fee (one-time) | $149 |
| Monthly | $179/mo |
| Minimum contract | 12 months |
| Annual payment | $1,790/year (2 months free) |

**What's included:** Custom domain setup + maintenance, everything in Max plan, priority support.
**Not included:** Custom APIs, custom integrations, bespoke feature development — quoted separately per project.

---

## Architecture: Option A — Next.js Middleware + Netlify

All tenants share a single Netlify deployment. Routing is handled at the middleware layer by reading the `Host` header.

```
fleet.tenant1.com  ──┐
fleet.tenant2.com  ──┤──▶ Netlify (single site) ──▶ Next.js middleware
slug.epuredrive.com──┘         reads Host header
                                    │
                         looks up tenant in DB
                         by custom_domain OR slug
                                    │
                              tenant context injected
                                    │
                         Supabase RLS enforces data isolation
```

### Why Option A
- Zero additional infrastructure or cost
- SSL per domain handled automatically by Netlify (Let's Encrypt)
- Scales to 20+ Enterprise tenants without architecture changes
- Standard approach used by Shopify, Calendly, and most multi-tenant SaaS

---

## Technical Design

### 1. Database change

Add column to `tenants` table:

```sql
ALTER TABLE tenants ADD COLUMN custom_domain TEXT UNIQUE;
```

Index for fast middleware lookup:
```sql
CREATE INDEX idx_tenants_custom_domain ON tenants(custom_domain);
```

### 2. Middleware — tenant resolution

`middleware.ts` currently resolves tenants by `slug` from subdomain.
Add a second resolution path: if the host does NOT end in `.epuredrive.com`, look up by `custom_domain`.

```
Host: fleet.yourbrand.com  → lookup tenants WHERE custom_domain = 'fleet.yourbrand.com'
Host: slug.epuredrive.com  → lookup tenants WHERE slug = 'slug'  (existing behavior)
```

If no tenant is found for the host → return 404. Never leak another tenant's data.

### 3. DomainSettings.tsx — connect the field

The custom domain input already exists in the UI but is non-functional.
Wire it to a Server Action that saves `custom_domain` to the `tenants` table.
Only enabled when `customDomainsEnabled = true` (set by admin for Enterprise tenants).

### 4. Netlify setup (manual, per tenant)

For each new Enterprise tenant:
1. Admin adds `custom_domain` value in DB (via admin panel or Supabase dashboard)
2. Admin sets `custom_domains_enabled = true` on the tenant row
3. Admin goes to Netlify → Site settings → Domain management → Add custom domain
4. Netlify provisions SSL automatically (~5 minutes)
5. Admin sends DNS instructions to tenant (see below)

---

## Activation Flow (Go-Live — Manual)

```
1. Tenant signs contract + pays setup fee ($149)
2. Tenant provides their domain (e.g., fleet.theirdomain.com)
3. Admin:
   a. Sets tenant plan = 'enterprise' in DB
   b. Sets custom_domain = 'fleet.theirdomain.com' in DB
   c. Sets custom_domains_enabled = true in DB
   d. Adds domain in Netlify dashboard → SSL auto-provisioned
4. Admin sends tenant their DNS instructions:
   ┌─────────────────────────────────────────┐
   │ Type:  CNAME                            │
   │ Host:  fleet (or @ for root domain)     │
   │ Value: [your-netlify-app].netlify.app   │
   │ TTL:   3600                             │
   └─────────────────────────────────────────┘
5. Tenant configures DNS at their registrar
6. Propagation: 15 min – 48h
7. Admin verifies domain is live, notifies tenant
```

Total admin time per tenant: ~30 minutes.

---

## Security & Data Isolation

### Technical isolation (3 layers)

| Layer | Mechanism |
|---|---|
| Network | SSL certificate per domain (Netlify + Let's Encrypt) |
| Routing | Middleware maps host → tenant_id; unknown host → 404 |
| Data | Supabase RLS — every query scoped to tenant_id |

- `tenant_id` is never exposed or guessable from the URL
- A misconfigured or unknown domain returns 404, not another tenant's data
- Tenants cannot access each other's DB rows (RLS enforces this at DB level)

### What this architecture does NOT provide
- Physical server isolation (shared infrastructure — standard for SaaS)
- Separate database per tenant
- Separate log streams per tenant

For rental car operators this level of isolation is industry-standard and legally sufficient with proper contracts.

---

## Legal & Contractual Layer

Four documents required per Enterprise tenant. Generate once, reuse with each tenant:

| Document | Purpose |
|---|---|
| **Service Contract** | Price, 12-month term, cancellation terms, payment schedule |
| **Terms of Service** | Acceptable use, platform limitations, liability cap |
| **Privacy Policy** | How end-user (their customers') data is handled |
| **DPA (Data Processing Agreement)** | Required if tenant has EU customers (GDPR Art. 28) |

**Recommended tools:** Termly or TermsFeed for template generation. Attorney review recommended before first Enterprise contract.

**Key contract clauses to include:**
- Data deletion within 30 days of cancellation
- No cross-tenant data sharing (ever)
- SLA: 99.5% monthly uptime
- Custom domain deactivated if contract lapses

---

## Out of Scope (Phase 2)

- Self-serve Enterprise upgrade flow (no Stripe checkout for Enterprise yet)
- Automatic DNS verification (tenant-side DNS check via API)
- Wildcard subdomain per tenant (e.g., `*.yourbrand.com`)
- Root domain support without CNAME flattening

---

## Implementation Order

1. DB migration — add `custom_domain` column
2. Middleware — add host-based tenant resolution
3. DomainSettings.tsx — wire Server Action to save `custom_domain`
4. Admin panel — expose `custom_domains_enabled` toggle per tenant
5. Legal docs — generate and publish ToS, Privacy Policy, DPA templates
