// __tests__/dashboard/sidebar-icons.test.ts
//
// Every sidebar entry (groups and links) must render an icon: either a vector
// icon from ICONS or a brand logo from LOGO_IMAGES. Labels are read from the
// Sidebar source so a new menu item without an icon fails here.
import { readFileSync } from 'fs'
import path from 'path'
import { ICONS } from '@/components/dashboard/icons'

const source = readFileSync(path.join(__dirname, '../../components/dashboard/Sidebar.tsx'), 'utf8')

function block(name: string): string {
  const start = source.indexOf(name)
  if (start === -1) throw new Error(`${name} not found in Sidebar.tsx`)
  const end = source.indexOf('\n}', start)
  return source.slice(start, end === -1 ? undefined : end)
}

const navLabels = [
  ...block('const NAV: NavEntry[]').matchAll(/label: '([^']+)'/g),
  ...block('const ADMIN_NAV: NavGroup').matchAll(/label: '([^']+)'/g),
].map((m) => m[1])

const logoLabels = new Set(
  [...block('const LOGO_IMAGES').matchAll(/^\s*'?([^':\n]+?)'?:\s*\{\s*src:/gm)].map((m) => m[1])
)

describe('dashboard sidebar icons', () => {
  it('finds the menu labels', () => {
    expect(navLabels.length).toBeGreaterThan(30)
    expect(navLabels).toContain('Overview')
    expect(navLabels).toContain('Profit & Loss')
    expect(logoLabels.has('Turo')).toBe(true)
  })

  it('has an icon or logo for every menu item', () => {
    const missing = navLabels.filter((label) => !ICONS[label] && !logoLabels.has(label))
    expect(missing).toEqual([])
  })
})
