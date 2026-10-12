// lib/email/templates/recalls.ts
import { compactLayout } from './_layout'

const APP_URL = 'https://epuredrive.com'
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"

export interface RecallEmailVehicle {
  carId: number
  name: string
  vin: string | null
  recalls: Array<{
    campaignNumber: string
    component: string | null
    summary: string | null
    parkIt: boolean
    parkOutside: boolean
  }>
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s
}

function recallRow(r: RecallEmailVehicle['recalls'][number]): string {
  const urgent = r.parkIt
    ? `<span style="color:#cc0000;font-weight:800;">DO NOT DRIVE — </span>`
    : r.parkOutside
      ? `<span style="color:#cc0000;font-weight:800;">PARK OUTSIDE (fire risk) — </span>`
      : ''
  return `<tr><td style="padding:8px 0;border-bottom:1px solid #f5f5f5;font-size:12px;color:#555;line-height:1.55;font-family:${FONT};">
    ${urgent}<strong style="color:#000;">${esc(r.component ?? 'Recall')}</strong>
    <span style="color:#aaa;"> · NHTSA ${esc(r.campaignNumber)}</span><br/>
    ${esc(truncate(r.summary ?? '', 220))}
  </td></tr>`
}

function vehicleBlock(v: RecallEmailVehicle): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:20px;">
    <tr><td style="padding:0 0 4px;font-size:14px;font-weight:800;color:#000;font-family:${FONT};">
      <a href="${APP_URL}/dashboard/fleet/${v.carId}" style="color:#000;text-decoration:none;">${esc(v.name)}</a>
      ${v.vin ? `<span style="font-size:11px;font-weight:400;color:#aaa;"> · VIN ${esc(v.vin)}</span>` : ''}
    </td></tr>
    ${v.recalls.map(recallRow).join('')}
  </table>`
}

export function recallAlertEmail(params: {
  tenantName: string
  vehicles: RecallEmailVehicle[]
}): { subject: string; html: string } {
  const total = params.vehicles.reduce((n, v) => n + v.recalls.length, 0)
  const urgent = params.vehicles.some((v) => v.recalls.some((r) => r.parkIt || r.parkOutside))
  const carCount = params.vehicles.length

  return {
    subject: `${urgent ? 'URGENT ' : ''}Safety recall${total !== 1 ? 's' : ''} — ${carCount} vehicle${carCount !== 1 ? 's' : ''} — ${params.tenantName}`,
    html: compactLayout({
      subheadline: 'Safety Recall Alert',
      headline: `NHTSA published ${total} new recall${total !== 1 ? 's' : ''} for vehicles in your fleet.`,
      body: `These campaigns cover the model of the vehicles below. Check each VIN to see whether your unit is included.${params.vehicles.map(vehicleBlock).join('')}`,
      cta: { label: 'Review Recalls', href: `${APP_URL}/dashboard/fleet` },
      note: 'Recalls are announced per model, so not every unit is affected. Enter the VIN at nhtsa.gov/recalls (it can take a few weeks for new campaigns to list every VIN) or ask any dealer — repairs are free — then mark each one on the vehicle page.',
    }),
  }
}
