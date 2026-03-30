// components/dashboard/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface NavItem {
  label: string
  href: string
}

interface NavGroup {
  label: string
  children: NavItem[]
}

type NavEntry = { label: string; href: string } | NavGroup

const NAV: NavEntry[] = [
  { label: 'Overview', href: '/dashboard' },
  {
    label: 'Operations',
    children: [
      { label: 'Bookings', href: '/dashboard/bookings' },
      { label: 'Fleet', href: '/dashboard/fleet' },
      { label: 'Maintenance', href: '/dashboard/maintenance' },
    ],
  },
  {
    label: 'Finance',
    children: [
      { label: 'Expenses', href: '/dashboard/finance/expenses' },
      { label: 'Reports', href: '/dashboard/finance/reports' },
      { label: 'ROI', href: '/dashboard/finance/roi' },
    ],
  },
  {
    label: 'Clients',
    children: [
      { label: 'Customers', href: '/dashboard/clients/customers' },
      { label: 'Consignments', href: '/dashboard/clients/consignments' },
    ],
  },
  { label: 'Team', href: '/dashboard/team' },
  {
    label: 'Integrations',
    children: [{ label: 'Turo', href: '/dashboard/integrations/turo' }],
  },
]

interface Props {
  email: string
  role: string | null
}

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'children' in entry
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname.startsWith(href)
}

export default function Sidebar({ email, role }: Props) {
  const pathname = usePathname()
  const initialOpen = NAV.filter(isGroup).reduce<Record<string, boolean>>(
    (acc, group) => {
      acc[group.label] = group.children.some((c) => isActive(pathname, c.href))
      return acc
    },
    {}
  )
  const [open, setOpen] = useState<Record<string, boolean>>(initialOpen)

  const toggle = (label: string) =>
    setOpen((prev) => ({ ...prev, [label]: !prev[label] }))

  const hidden: string[] = []
  if (role === 'staff') hidden.push('Finance', 'Clients')
  if (role === 'finance') hidden.push('Maintenance', 'Integrations', 'Team')

  return (
    <aside className="w-56 bg-[#111] border-r border-white/10 flex flex-col shrink-0 h-full">
      <div className="h-16 flex items-center px-5 border-b border-white/10">
        <img src="/assets/logo.png" alt="éPure Drive" className="h-7" />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map((entry) => {
          if (isGroup(entry)) {
            if (hidden.includes(entry.label)) return null
            const isOpen = open[entry.label] ?? false
            return (
              <div key={entry.label}>
                <button
                  onClick={() => toggle(entry.label)}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <span>{entry.label}</span>
                  <span className="text-xs">{isOpen ? '▾' : '▸'}</span>
                </button>
                {isOpen && (
                  <div className="ml-3 mt-0.5 space-y-0.5">
                    {entry.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive(pathname, child.href)
                            ? 'bg-white/10 text-white font-medium'
                            : 'text-white/50 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={entry.href}
              href={entry.href}
              className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive(pathname, entry.href)
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {entry.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-xs text-white/30 truncate">{email}</p>
        {role && <p className="text-xs text-white/20 mt-0.5 capitalize">{role}</p>}
      </div>
    </aside>
  )
}
