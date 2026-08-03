// components/dashboard/Sidebar.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ICONS, IconChevron, IconLogout } from './icons'

// ── Navigation Structure ───────────────────────────────────────────────────────

interface NavItem {
  label: string
  href: string
}

interface NavGroup {
  label: string
  children: NavItem[]
}

type NavEntry = NavItem | NavGroup

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
      { label: 'Taxes', href: '/dashboard/finance/taxes' },
      { label: 'Reports', href: '/dashboard/finance/reports' },
      { label: 'ROI', href: '/dashboard/finance/roi' },
      { label: 'Utilization', href: '/dashboard/finance/utilization' },
    ],
  },
  {
    label: 'Clients',
    children: [
      { label: 'Customers', href: '/dashboard/clients/customers' },
      { label: 'Consignments', href: '/dashboard/clients/consignments' },
    ],
  },
  {
    label: 'Integrations',
    children: [
      { label: 'Turo', href: '/dashboard/integrations/turo' },
      { label: 'QuickBooks', href: '/dashboard/integrations/quickbooks' },
      { label: 'Bouncie', href: '/dashboard/integrations/bouncie' },
      { label: 'Google Calendar', href: '/dashboard/integrations/google-calendar' },
    ],
  },
  {
    label: 'Telematics',
    children: [
      { label: 'Live Map',  href: '/dashboard/telematics' },
      { label: 'Trips',     href: '/dashboard/telematics/trips' },
      { label: 'Alerts',    href: '/dashboard/telematics/alerts' },
      { label: 'Geofences', href: '/dashboard/telematics/geofences' },
      { label: 'Devices',   href: '/dashboard/telematics/devices' },
    ],
  },
  {
    label: 'Settings',
    children: [
      { label: 'General', href: '/dashboard/settings' },
      { label: 'Payments & Invoices', href: '/dashboard/settings/payments' },
      { label: 'Billing & Plans', href: '/dashboard/settings/billing' },
      { label: 'Team & Roles', href: '/dashboard/settings/roles' },
      { label: 'Notifications', href: '/dashboard/settings/notifications' },
      { label: 'Security', href: '/dashboard/settings/security' },
      { label: 'Rental Extras', href: '/dashboard/settings/extras' },
      { label: 'Rental Agreement', href: '/dashboard/settings/agreement' },
      { label: 'Custom Domain', href: '/dashboard/settings/domain' },
      { label: 'API & Webhooks', href: '/dashboard/settings/api' },
    ],
  },
]

const ADMIN_NAV: NavGroup = {
  label: 'Admin',
  children: [
    { label: 'Tenants', href: '/dashboard/admin/tenants' },
    { label: 'Platform Stats', href: '/dashboard/admin/stats' },
    { label: 'Plans & Billing', href: '/dashboard/admin/plans' },
    { label: 'All Users', href: '/dashboard/admin/users' },
    { label: 'Support Tickets', href: '/dashboard/admin/support' },
    { label: 'Feature Flags', href: '/dashboard/admin/flags' },
    { label: 'System Logs', href: '/dashboard/admin/logs' },
  ],
}

// ── Helpers ────────────────────────────────────────────────────────────────────

interface Props {
  email: string
  role: string | null
  name?: string | null
  tenantName?: string | null
  tenantLogoUrl?: string | null
  featureFlags?: Record<string, boolean>
}

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'children' in entry
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(href + '/')
}

function hasActiveChild(pathname: string, children: NavItem[]): boolean {
  return children.some((c) => isActive(pathname, c.href))
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function Sidebar({ email, role, name, tenantName, tenantLogoUrl, featureFlags = {} }: Props) {
  const displayBrand = tenantName || 'éPure Drive'
  const brandInitials = (tenantName || 'éP')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [mobileOpen, setMobileOpen] = useState(false)

  const isSuperuser = role === 'superuser'

  // Map feature flags to nav items that should be hidden when disabled
  const flagHiddenItems = useMemo(() => {
    const items: string[] = []
    if (!featureFlags['turo_sync']) items.push('Turo')
    if (!featureFlags['quickbooks_sync']) items.push('QuickBooks')
    if (!featureFlags['custom_domains']) items.push('Custom Domain')
    if (!featureFlags['api_access'] && !featureFlags['webhooks']) items.push('API & Webhooks')
    if (!featureFlags['bouncie_telematics']) items.push('Telematics', 'Bouncie')
    return items
  }, [featureFlags])

  const fullNav = useMemo<NavEntry[]>(
    () => (isSuperuser ? [...NAV, ADMIN_NAV] : NAV),
    [isSuperuser]
  )

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  useEffect(() => {
    const initialOpen = fullNav.filter(isGroup).reduce<Record<string, boolean>>(
      (acc, group) => {
        acc[group.label] = hasActiveChild(pathname, group.children)
        return acc
      },
      {}
    )
    setOpen(initialOpen)
  }, [pathname, fullNav])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const toggle = useCallback((label: string) =>
    setOpen((prev) => ({ ...prev, [label]: !prev[label] })), [])

  // Role-based visibility
  const hidden: string[] = []
  if (role === 'staff') hidden.push('Finance', 'Clients', 'Settings')
  if (role === 'finance') hidden.push('Maintenance', 'Integrations', 'Team', 'Admin')

  // Combine role-hidden and flag-hidden items
  const allHiddenItems = [...hidden, ...flagHiddenItems]

  const renderIcon = (label: string, className: string) => {
    const Icon = ICONS[label]
    return Icon ? <Icon className={className} /> : null
  }

  const navContent = (
    <>
      {/* ── Brand Header ──────────────────────────────────────────────── */}
      <div className="h-20 flex items-center px-5 border-b border-surfaceBorder relative gap-3">
        <div className="absolute inset-0 bg-hero-glow opacity-40 mix-blend-screen pointer-events-none overflow-hidden" />
        <div className="relative z-10 w-9 h-9 rounded-lg overflow-hidden shrink-0 shadow-[0_0_12px_rgba(255,255,255,0.15)] bg-white/5 flex items-center justify-center">
          {tenantLogoUrl ? (
            <Image
              src={tenantLogoUrl}
              alt={displayBrand}
              width={36}
              height={36}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : tenantName ? (
            <span className="text-[11px] font-bold text-white/80 tracking-tight">{brandInitials}</span>
          ) : (
            <Image src="/favicon.svg" alt="éPure" width={36} height={36} className="w-full h-full" />
          )}
        </div>
        <span className="relative z-10 text-white font-semibold text-sm tracking-wide flex-1 truncate capitalize">{displayBrand}</span>
      </div>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
        {fullNav.map((entry) => {
          if (isGroup(entry)) {
            if (allHiddenItems.includes(entry.label)) return null
            // Filter out flag-gated children
            const visibleChildren = entry.children.filter((c) => !allHiddenItems.includes(c.label))
            if (visibleChildren.length === 0) return null
            const isOpen = open[entry.label] ?? false
            const groupActive = hasActiveChild(pathname, visibleChildren)
            const isAdmin = entry.label === 'Admin'

            return (
              <div key={entry.label} className={`mb-1 ${isAdmin ? 'mt-4 pt-4 border-t border-white/[0.06]' : ''}`}>
                {/* Section header label */}
                <button
                  onClick={() => toggle(entry.label)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[12px] font-bold tracking-[0.15em] uppercase transition-all duration-200 ${
                    groupActive
                      ? 'text-white/90 bg-white/[0.06]'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                  } ${isAdmin ? 'text-amber-400/70 hover:text-amber-400/95' : ''}`}
                >
                  {renderIcon(entry.label, `w-4 h-4 shrink-0 ${isAdmin ? 'text-amber-400/50' : 'opacity-50'}`)}
                  <span className="flex-1 text-left">{entry.label}</span>
                  <IconChevron className="w-3.5 h-3.5 opacity-40" open={isOpen} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ease-out ${isOpen ? 'max-h-96 opacity-100 mt-0.5' : 'max-h-0 opacity-0'}`}>
                  <div className="ml-4 pl-3 border-l border-white/[0.06] space-y-0.5 py-1">
                    {visibleChildren.map((child) => {
                      const active = isActive(pathname, child.href)
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-200 ${
                            active
                              ? 'bg-white/[0.10] text-white font-medium shadow-[inset_2px_0_0_0_rgba(255,255,255,0.7)]'
                              : 'text-white/60 hover:text-white/90 hover:bg-white/[0.05] hover:translate-x-0.5'
                          }`}
                        >
                          {renderIcon(child.label, `w-3.5 h-3.5 shrink-0 ${active ? 'opacity-80' : 'opacity-40'}`)}
                          <span>{child.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          }

          // Top-level item (e.g., Overview)
          if (allHiddenItems.includes(entry.label)) return null
          const active = isActive(pathname, entry.href)
          return (
            <Link
              key={entry.href}
              href={entry.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200 ${
                active
                  ? 'bg-white/[0.10] text-white font-semibold shadow-[inset_3px_0_0_0_rgba(255,255,255,0.7)]'
                  : 'text-white/60 hover:text-white/90 hover:bg-white/[0.05] hover:translate-x-0.5'
              }`}
            >
              {renderIcon(entry.label, `w-4 h-4 shrink-0 ${active ? 'opacity-90' : 'opacity-40'}`)}
              <span className="font-medium tracking-wide">{entry.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ── User Footer ───────────────────────────────────────────────── */}
      <div className="p-3 border-t border-surfaceBorder backdrop-blur-md bg-white/[0.02]">
        <div className="group/user relative">
          {/* Popover — sits directly above with no gap, invisible bridge connects them */}
          <div className="absolute bottom-full left-0 right-0 pb-1 opacity-0 pointer-events-none group-hover/user:opacity-100 group-hover/user:pointer-events-auto transition-all duration-200">
            <div className="bg-[#1a1a1e] border border-white/[0.08] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] p-1.5">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-500/[0.08] transition-all text-[12px] font-medium"
              >
                <IconLogout className="w-3.5 h-3.5" />
                Log out
              </button>
            </div>
          </div>

          {/* User button */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/[0.06] group-hover/user:border-white/[0.12] group-hover/user:bg-white/[0.04] cursor-pointer transition-all duration-200">
            <div className="w-9 h-9 rounded-full bg-white/[0.10] border border-white/[0.12] flex items-center justify-center shrink-0">
              <span className="text-[13px] font-bold text-white/80">
                {name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : email.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-white/80 font-medium truncate">{name || email}</div>
              {role && (
                <div className="text-[10px] text-white/35 font-medium uppercase tracking-wider">{isSuperuser ? 'Admin' : role}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-5 left-4 z-50 md:hidden w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 glass z-20 flex-col shrink-0 h-full shadow-[4px_0_24px_rgba(0,0,0,0.5)] relative">
        {navContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 glass flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.5)] md:hidden transition-transform duration-300 ease-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-6 right-4 z-10 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-colors"
          aria-label="Close menu"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        {navContent}
      </aside>

    </>
  )
}
