// components/dashboard/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

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
      { label: 'Calendar', href: '/dashboard/calendar' },
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
    children: [{ label: 'Cal Sync', href: '/dashboard/integrations/turo' }],
  },
  { label: 'Settings', href: '/dashboard/settings' },
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
  const router = useRouter()
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  useEffect(() => {
    const initialOpen = NAV.filter(isGroup).reduce<Record<string, boolean>>(
      (acc, group) => {
        acc[group.label] = group.children.some((c) => isActive(pathname, c.href))
        return acc
      },
      {}
    )
    setOpen(initialOpen)
  }, [pathname])

  const toggle = (label: string) =>
    setOpen((prev) => ({ ...prev, [label]: !prev[label] }))

  const hidden: string[] = []
  if (role === 'staff') hidden.push('Finance', 'Clients')
  if (role === 'finance') hidden.push('Maintenance', 'Integrations', 'Team')

  return (
    <aside className="w-64 glass z-20 flex flex-col shrink-0 h-full shadow-[4px_0_24px_rgba(0,0,0,0.5)] relative">
      <div className="h-20 flex items-center justify-center border-b border-surfaceBorder px-6 relative overflow-hidden">
        {/* Subtle glow behind logo */}
        <div className="absolute inset-0 bg-hero-glow opacity-40 mix-blend-screen pointer-events-none" />
        <img src="/assets/logo.png" alt="éPure Drive" className="h-8 relative z-10 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
      </div>

      <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto custom-scrollbar">
        {NAV.map((entry) => {
          if (isGroup(entry)) {
            if (hidden.includes(entry.label)) return null
            const isOpen = open[entry.label] ?? false
            return (
              <div key={entry.label} className="mb-2">
                <button
                  onClick={() => toggle(entry.label)}
                  className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-[13px] font-semibold tracking-wider text-white/50 hover:text-white hover:bg-white/5 transition-all duration-300 uppercase"
                >
                  <span>{entry.label}</span>
                  <span className="text-xs transition-transform duration-300" style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}>▸</span>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-48 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                  <div className="ml-2 pl-3 border-l-2 border-surfaceBorder space-y-1">
                    {entry.children.map((child) => {
                      const active = isActive(pathname, child.href)
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`block px-4 py-2 rounded-lg text-sm transition-all duration-300 ${
                            active
                              ? 'bg-white/10 text-white font-medium shadow-[inset_3px_0_0_0_#fff]'
                              : 'text-white/60 hover:text-white hover:bg-white/5 hover:translate-x-1'
                          }`}
                        >
                          {child.label}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          }

          const active = isActive(pathname, entry.href)
          return (
            <Link
              key={entry.href}
              href={entry.href}
              className={`flex items-center px-4 py-3 rounded-xl text-sm transition-all duration-300 mb-1 ${
                active
                  ? 'bg-white/10 text-white font-medium shadow-[inset_3px_0_0_0_#fff]'
                  : 'text-white/60 hover:text-white hover:bg-white/5 hover:translate-x-1'
              }`}
            >
              <span className="font-semibold tracking-wide">{entry.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-6 border-t border-surfaceBorder backdrop-blur-md bg-white/[0.02]">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-white/80 font-medium truncate">{email}</p>
          {role && (
            <div className="mt-1">
              <span className="inline-block px-2.5 py-1 text-[10px] font-bold tracking-widest text-primary bg-primary/10 border border-primary/20 rounded-full uppercase">
                {role}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="mt-4 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Log out
        </button>
      </div>
    </aside>
  )
}
