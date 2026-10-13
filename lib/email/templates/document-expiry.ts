// lib/email/templates/document-expiry.ts
import { compactLayout } from './_layout'
import { formatDate } from '@/lib/utils/format'
import type { ExpiryKind } from '@/lib/fleet/document-expiry'

const APP_URL = 'https://epuredrive.com'
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"

export interface ExpiryEmailItem {
  carId: number
  carName: string
  kind: ExpiryKind
  expiry: string
  daysLeft: number
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const KIND_LABEL: Record<ExpiryKind, string> = { registration: 'Registration', insurance: 'Insurance' }

function when(daysLeft: number): string {
  if (daysLeft < 0) return `<span style="color:#cc0000;font-weight:800;">EXPIRED ${-daysLeft} day${daysLeft === -1 ? '' : 's'} ago</span>`
  if (daysLeft === 0) return `<span style="color:#cc0000;font-weight:800;">EXPIRES TODAY</span>`
  return `expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
}

function row(i: ExpiryEmailItem): string {
  return `<tr><td style="padding:10px 0;border-bottom:1px solid #f5f5f5;font-size:13px;color:#555;line-height:1.5;font-family:${FONT};">
    <a href="${APP_URL}/dashboard/fleet/${i.carId}" style="color:#000;font-weight:700;text-decoration:none;">${esc(i.carName)}</a><br/>
    ${KIND_LABEL[i.kind]} ${when(i.daysLeft)} · ${esc(formatDate(i.expiry))}
  </td></tr>`
}

export function documentExpiryEmail(params: { tenantName: string; items: ExpiryEmailItem[] }): { subject: string; html: string } {
  const expired = params.items.filter((i) => i.daysLeft <= 0).length
  const n = params.items.length
  return {
    subject: `${expired > 0 ? 'EXPIRED: ' : ''}${n} vehicle document${n === 1 ? '' : 's'} ${expired > 0 ? 'need' : 'expiring'}${expired > 0 && n === 1 ? 's' : ''} attention — ${params.tenantName}`,
    html: compactLayout({
      subheadline: 'Vehicle documents',
      headline: expired > 0 ? 'Some vehicle documents have expired.' : 'Vehicle documents expiring soon.',
      body: `Renew these before the cars go out on rent.<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:18px;">${params.items.map(row).join('')}</table>`,
      cta: { label: 'Open Fleet', href: `${APP_URL}/dashboard/fleet` },
      note: 'After renewing, update the new expiry date on the vehicle page so the reminder stops. You get one email at 30 days, 7 days and on the expiry date.',
    }),
  }
}
