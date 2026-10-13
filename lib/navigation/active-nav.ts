// lib/navigation/active-nav.ts
//
// Which sidebar link is "current": the most specific href the path falls
// under. A plain prefix test lit up parents on every child page (Live Map on
// /telematics/devices, General on every /settings page).

const OVERVIEW = '/dashboard'

export function activeHref(pathname: string, hrefs: readonly string[]): string | null {
  let best: string | null = null
  for (const href of hrefs) {
    const matches = href === OVERVIEW ? pathname === OVERVIEW : pathname === href || pathname.startsWith(`${href}/`)
    if (matches && (best == null || href.length > best.length)) best = href
  }
  return best
}
