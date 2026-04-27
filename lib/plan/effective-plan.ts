/**
 * Free-launch mode: when enabled via env, every tenant is treated as if on the
 * Max plan for gating purposes (telematics, integrations, team invites, custom
 * agreements, priority support). The actual `tenants.plan` column is left
 * untouched so the Stripe webhook keeps working and the change is reversible
 * with a single env flip.
 *
 * NEXT_PUBLIC_ prefix so the same constant is readable in client components
 * (e.g. UpgradeButton hides itself client-side).
 */
const FREE_LAUNCH_MODE = process.env.NEXT_PUBLIC_FREE_LAUNCH_MODE === 'true'

/** Plan-tied feature flags that get auto-enabled during free launch. */
export const PLAN_GATED_FLAGS = [
  'bouncie_telematics',
  'turo_sync',
  'quickbooks_sync',
  'custom_domains',
  'api_access',
  'webhooks',
] as const

/** Flat platform fee applied to every online payment during free launch. */
export const FREE_LAUNCH_FEE_RATE = 0.01

/** Default per-plan fee table (used when free launch is off). */
const FEE_BY_PLAN: Record<string, number> = {
  max: 0,
  enterprise: 0,
  pro: 0.01,
  starter: 0.015,
  free: 0.02,
}

export function isFreeLaunchMode(): boolean {
  return FREE_LAUNCH_MODE
}

/**
 * Returns the plan that gating logic should use. During free launch every
 * tenant is treated as 'max'; otherwise the actual plan is returned.
 */
export function getEffectivePlan(actualPlan: string | null | undefined): string {
  if (FREE_LAUNCH_MODE) return 'max'
  return actualPlan ?? 'free'
}

/**
 * Returns the platform fee rate (0..1) to apply on a Stripe Connect payment.
 * During free launch every tenant gets a flat 1% rate regardless of their
 * stored plan.
 */
export function getPlatformFeeRate(actualPlan: string | null | undefined): number {
  if (FREE_LAUNCH_MODE) return FREE_LAUNCH_FEE_RATE
  const key = actualPlan ?? 'free'
  return FEE_BY_PLAN[key] ?? FEE_BY_PLAN.free
}

export function isPlanGatedFlag(flagKey: string): boolean {
  return (PLAN_GATED_FLAGS as readonly string[]).includes(flagKey)
}
