# Landing Page Templates

## Problem

Tenants must manually fill every landing page field (tagline, description, experience pillars, how-it-works) from scratch. This slows onboarding and leads to incomplete public sites.

## Solution

Add a template picker at the top of the Settings page. Tenants select one of 4 pre-built templates to instantly pre-fill all copywriting fields. They can then customize individual fields before saving.

## Templates

Four templates, each pre-filling: `tagline`, `description`, `experience_pillars` (3), and `how_it_works` (3 steps).

| Template | Tone | Target tenant |
|---|---|---|
| **Luxury** | Premium, exclusive, white-glove | Exotic/luxury rental operators |
| **Corporate** | Professional, reliable, fleet-ready | Corporate fleet & event providers |
| **Budget** | Affordable, transparent, no-frills | Value-oriented rental shops |
| **Dealership** | Inventory-focused, variety, selection | Multi-brand dealerships with rentals |

### Fields NOT pre-filled

Brand name, logo, colors, hero image, contact info, pickup locations, business hours. These are brand-specific or operational data, not template copywriting.

## Data Structure

New file: `lib/constants/landing-templates.ts`

```ts
import type { ExperiencePillar, HowItWorksStep } from '@/lib/supabase/types'

export interface LandingTemplate {
  id: string
  label: string
  description: string
  tagline: string
  siteDescription: string
  pillars: ExperiencePillar[]
  howItWorks: HowItWorksStep[]
}

export const LANDING_TEMPLATES: LandingTemplate[] = [
  { id: 'luxury', ... },
  { id: 'corporate', ... },
  { id: 'budget', ... },
  { id: 'dealership', ... },
]
```

## UI Changes

### New: Template Picker Card

- Location: top of `BrandSettings.tsx`, above the setup checklist
- Layout: `grid-cols-2 md:grid-cols-4`
- Each card shows: template label, one-line description
- Glass card styling consistent with existing settings sections

### Confirmation Flow

- Clicking a template card shows an inline confirmation bar: "Apply [Template Name]? This will overwrite your tagline, description, experience pillars, and how-it-works steps."
- Two buttons: "Apply Template" (primary) and "Cancel"
- On confirm: sets `tagline`, `description`, `pillars`, and `howItWorks` state in BrandSettings
- Changes are local until the tenant clicks "Save Settings"

### Existing UI

- All current editable fields remain unchanged
- How It Works template picker (granular, per-section) stays as-is
- Experience pillars "Reset to defaults" button stays
- Setup checklist continues to work (completes faster after template application)

## Files to Create

| File | Purpose |
|---|---|
| `lib/constants/landing-templates.ts` | Template definitions (4 templates) |

## Files to Modify

| File | Change |
|---|---|
| `app/(dashboard)/dashboard/settings/BrandSettings.tsx` | Add template picker card + confirmation UI at top of form |

## No Database Changes

Templates are client-side presets. They pre-fill React state. No new columns, tables, or migrations needed.

## No Backend Changes

No changes to `actions.ts`. The existing `updateTenantBranding` action already handles all the fields that templates pre-fill.

## Testing

- Apply each template and verify all 4 field groups update in the form
- Apply a template, modify one field, save, reload — verify the modified value persists
- Apply a template, cancel confirmation — verify no fields change
- Verify setup checklist reflects completion after template + save
