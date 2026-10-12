/**
 * Events whose in-app (bell) channel is ON until the tenant turns it off.
 * Everything else defaults to off — safety alerts shouldn't depend on an
 * operator having found the settings page first.
 */
export const APP_ENABLED_BY_DEFAULT: ReadonlySet<string> = new Set(['vehicle_recall', 'daily_schedule'])

export function defaultAppEnabled(event: string): boolean {
  return APP_ENABLED_BY_DEFAULT.has(event)
}
