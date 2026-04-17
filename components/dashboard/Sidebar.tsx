// components/dashboard/Sidebar.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import SupportModal from '@/components/dashboard/SupportModal'
import NotificationBell from '@/components/dashboard/NotificationBell'

// ── SVG Icon Components ────────────────────────────────────────────────────────

function IconOverview({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconBookings({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 14l2 2 4-4" />
    </svg>
  )
}

function IconFleet({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17h14M5 17a2 2 0 01-2-2V9a1 1 0 011-1l2.34-3.12A2 2 0 017.96 4h8.08a2 2 0 011.62.88L20 8a1 1 0 011 1v6a2 2 0 01-2 2M5 17a2 2 0 100 4 2 2 0 000-4zm14 0a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
  )
}

function IconMaintenance({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

function IconExpenses({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
      <path d="M12 2L2 7l10 5 10-5L12 2z" />
    </svg>
  )
}

function IconReports({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h7" />
      <line x1="16" y1="19" x2="22" y2="19" />
      <line x1="16" y1="15" x2="22" y2="15" />
      <polyline points="8 15 10 17 14 11" />
    </svg>
  )
}

function IconROI({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}

function IconCustomers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

function IconConsignments({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3h5v5" />
      <path d="M8 3H3v5" />
      <path d="M12 22v-8.3a4 4 0 00-1.172-2.872L3 3" />
      <path d="M15 9l6-6" />
    </svg>
  )
}

function IconTeam({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 100 8 4 4 0 000-8z" />
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    </svg>
  )
}

function IconTuro({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8zm-2 4v2H8v4h2v2h4v-2h2v-4h-2V8h-4z" />
    </svg>
  )
}

function IconQuickBooks({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 8v8h2v-3h2a3 3 0 000-6H8zm2 1.5h2a1.5 1.5 0 010 3h-2v-3z" />
      <path d="M14 16V8h2v3h-2" stroke="currentColor" strokeWidth="0" />
      <rect x="14" y="8" width="2" height="8" rx="0.5" />
    </svg>
  )
}

function IconSquare({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <rect x="8" y="8" width="8" height="8" rx="1" />
    </svg>
  )
}

function IconStripe({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 1.5c4.69 0 8.5 3.81 8.5 8.5s-3.81 8.5-8.5 8.5S3.5 16.69 3.5 12 7.31 3.5 12 3.5zM11.2 8c-2.08 0-3.2 1.1-3.2 2.4 0 1.86 2.12 2.18 3.24 2.68.66.3.96.56.96 1.02 0 .54-.52.9-1.36.9-.96 0-1.92-.44-2.64-1.02l-.8 1.44C8.32 16.18 9.6 16.7 10.88 16.7c2.16 0 3.32-1.12 3.32-2.5 0-1.86-2.12-2.22-3.24-2.72-.66-.28-.96-.52-.96-.96 0-.44.44-.82 1.2-.82.8 0 1.56.32 2.2.76l.72-1.4C13.28 8.38 12.2 8 11.2 8z" />
    </svg>
  )
}

function IconSecurity({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
      <circle cx="12" cy="16" r="1" />
    </svg>
  )
}

function IconSupportTickets({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" />
      <path d="M4 12h16a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4a2 2 0 012-2z" />
      <line x1="6" y1="8" x2="6.01" y2="8" />
      <line x1="6" y1="16" x2="6.01" y2="16" />
    </svg>
  )
}

function IconGeneral({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

function IconBilling({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
}

function IconRoles({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function IconNotifications({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  )
}

function IconDomain({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  )
}

function IconAPI({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
      <line x1="14" y1="4" x2="10" y2="20" />
    </svg>
  )
}

function IconTaxes({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="15" x2="15" y2="15" />
      <line x1="9" y1="11" x2="15" y2="11" />
    </svg>
  )
}

function IconPayments({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
      <line x1="5" y1="15" x2="9" y2="15" />
      <line x1="13" y1="15" x2="17" y2="15" />
    </svg>
  )
}

function IconAgreement({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 13l2 2 4-4" />
    </svg>
  )
}

// Admin icons
function IconTenants({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-4h6v4" />
      <path d="M9 10h.01M15 10h.01M9 14h.01M15 14h.01" />
    </svg>
  )
}

function IconPlatformStats({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="12" width="4" height="9" rx="1" />
      <rect x="10" y="8" width="4" height="13" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  )
}

function IconPlans({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

function IconAllUsers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

function IconFeatureFlags({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  )
}

function IconSystemLogs({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function IconChevron({ className, open }: { className?: string; open: boolean }) {
  return (
    <svg
      className={`${className} transition-transform duration-300 ${open ? 'rotate-90' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function IconLogout({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

// ── Icon Map ───────────────────────────────────────────────────────────────────

const ICONS: Record<string, (props: { className?: string }) => React.ReactNode> = {
  Overview: IconOverview,
  Calendar: IconCalendar,
  Bookings: IconBookings,
  Fleet: IconFleet,
  Maintenance: IconMaintenance,
  Expenses: IconExpenses,
  Taxes: IconTaxes,
  Reports: IconReports,
  ROI: IconROI,
  Customers: IconCustomers,
  Consignments: IconConsignments,
  Team: IconTeam,
  // Integration brand icons
  Turo: IconTuro,
  QuickBooks: IconQuickBooks,
  Square: IconSquare,
  Stripe: IconStripe,
  // Settings sub-pages
  General: IconGeneral,
  'Payments & Invoices': IconPayments,
  'Billing & Plans': IconBilling,
  'Team & Roles': IconRoles,
  Notifications: IconNotifications,
  Security: IconSecurity,
  'Rental Agreement': IconAgreement,
  'Custom Domain': IconDomain,
  'API & Webhooks': IconAPI,
  // Admin sub-pages
  Tenants: IconTenants,
  'Platform Stats': IconPlatformStats,
  'Plans & Billing': IconPlans,
  'All Users': IconAllUsers,
  'Support Tickets': IconSupportTickets,
  'Feature Flags': IconFeatureFlags,
  'System Logs': IconSystemLogs,
  // Group icons (used for section headers)
  Operations: IconCalendar,
  Finance: IconExpenses,
  Clients: IconCustomers,
  Integrations: IconTuro,
  Settings: IconGeneral,
  Admin: IconPlatformStats,
}

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

export default function Sidebar({ email, role, name, featureFlags = {} }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [mobileOpen, setMobileOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)

  const isSuperuser = role === 'superuser'

  // Map feature flags to nav items that should be hidden when disabled
  const flagHiddenItems = useMemo(() => {
    const items: string[] = []
    if (!featureFlags['turo_sync']) items.push('Turo')
    if (!featureFlags['quickbooks_sync']) items.push('QuickBooks')
    if (!featureFlags['custom_domains']) items.push('Custom Domain')
    if (!featureFlags['api_access'] && !featureFlags['webhooks']) items.push('API & Webhooks')
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
        <div className="relative z-10 w-9 h-9 rounded-lg overflow-hidden shrink-0 shadow-[0_0_12px_rgba(255,255,255,0.15)]">
          <Image src="/favicon.svg" alt="éPure" width={36} height={36} className="w-full h-full" />
        </div>
        <span className="relative z-10 text-white font-semibold text-sm tracking-wide flex-1">éPure Drive</span>
        <div className="relative z-10">
          <NotificationBell />
        </div>
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
      <div className="p-5 border-t border-surfaceBorder backdrop-blur-md bg-white/[0.02]">
        <div className="flex items-center gap-3">
          {role && (
            <span className={`inline-block shrink-0 px-2.5 py-1 text-[10px] font-bold tracking-widest rounded-full uppercase ${
              isSuperuser
                ? 'text-amber-300 bg-amber-500/10 border border-amber-500/20'
                : 'text-primary bg-primary/10 border border-primary/20'
            }`}>
              {isSuperuser ? 'Admin' : role}
            </span>
          )}
          {name && (
            <span className="text-[13px] text-white/60 font-medium truncate">{name}</span>
          )}
        </div>
        <button
          onClick={() => setSupportOpen(true)}
          className="mt-4 flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-white/30
                     hover:text-white/60 hover:bg-white/[0.03] transition-all text-xs font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"/>
          </svg>
          Support
        </button>
        <button
          onClick={handleLogout}
          className="mt-1 w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <IconLogout className="w-4 h-4" />
          <span className="text-[13px] font-medium">Log out</span>
        </button>
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

      <SupportModal isOpen={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  )
}
