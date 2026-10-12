// lib/email/templates/daily-schedule.ts
import { compactLayout } from './_layout'
import { formatClock, scheduleSummary, type ScheduleItem } from '@/lib/daily-schedule/build'

const APP_URL = 'https://epuredrive.com'
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function itemRow(i: ScheduleItem): string {
  const time = formatClock(i.time)
  const phone = i.phone
    ? ` · <a href="tel:${esc(i.phone.replace(/[^\d+]/g, ''))}" style="color:#555;">${esc(i.phone)}</a>`
    : ''
  return `<tr>
    <td style="padding:10px 12px 10px 0;border-bottom:1px solid #f5f5f5;width:64px;vertical-align:top;font-size:13px;font-weight:700;color:#000;font-family:${FONT};">${time ?? '—'}</td>
    <td style="padding:10px 0;border-bottom:1px solid #f5f5f5;font-size:13px;color:#555;line-height:1.5;font-family:${FONT};">
      <strong style="color:#000;">${esc(i.customer)}</strong>${phone}<br/>
      ${esc(i.vehicle)}${i.bookingCode ? `<span style="color:#aaa;"> · ${esc(i.bookingCode)}</span>` : ''}
    </td>
  </tr>`
}

function section(title: string, items: ScheduleItem[]): string {
  if (!items.length) return ''
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:22px;">
    <tr><td colspan="2" style="padding:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#999;font-family:${FONT};">${title} (${items.length})</td></tr>
    ${items.map(itemRow).join('')}
  </table>`
}

export function dailyScheduleEmail(params: {
  tenantName: string
  dateLabel: string
  pickups: ScheduleItem[]
  returns: ScheduleItem[]
}): { subject: string; html: string } {
  const summary = scheduleSummary(params)
  return {
    subject: `Today: ${summary} — ${params.tenantName}`,
    html: compactLayout({
      subheadline: params.dateLabel,
      headline: `Today: ${summary}`,
      body: `Here's what's moving in your fleet today.${section('Pickups', params.pickups)}${section('Returns', params.returns)}`,
      cta: { label: 'Open Dashboard', href: `${APP_URL}/dashboard` },
      note: 'Sent at 7am on days with pickups or returns. Turn it off under Settings → Notifications → Daily Schedule.',
    }),
  }
}
