// lib/utils/routing.ts
const RESERVED = ['www', 'admin', 'app', 'api']

export function getTenantSlug(host: string): string | null {
  // Strip port if present (e.g. localhost:3000)
  const hostname = host.split(':')[0]
  
  // Local development support (e.g. slug.localhost)
  if (process.env.NODE_ENV !== 'production') {
    if (hostname.endsWith('.localhost')) {
      const slug = hostname.replace('.localhost', '')
      if (!RESERVED.includes(slug)) return slug
    }
  }

  const match = hostname.match(/^([a-z0-9][a-z0-9-]*[a-z0-9])\.epuredrive\.com$/)
  if (match && !RESERVED.includes(match[1])) {
    return match[1]
  }
  return null
}
