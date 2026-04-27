// lib/email/templates/rentals.ts
import { compactLayout, tenantCompactLayout, type TenantBrand } from './_layout'

const APP_URL = 'https://epuredrive.com'

export type { TenantBrand }

// ─── Operator-facing (internal notifications) ──────────────────────────────

export function newBookingEmail(params: {
  customerName: string
  carName: string
  pickupDate: string
  returnDate: string
  totalAmount: number | null
  tenantName: string
}): { subject: string; html: string } {
  return {
    subject: `New Booking: ${params.customerName} — ${params.carName}`,
    html: compactLayout({
      subheadline: params.tenantName,
      headline: 'New booking received.',
      body: `A new reservation has been created.`,
      details: [
        { label: 'Customer', value: params.customerName },
        { label: 'Vehicle', value: params.carName },
        { label: 'Pickup', value: params.pickupDate },
        { label: 'Return', value: params.returnDate },
        ...(params.totalAmount != null
          ? [{ label: 'Total', value: `$${params.totalAmount.toLocaleString()}` }]
          : []),
      ],
      cta: { label: 'View Booking', href: `${APP_URL}/dashboard/bookings` },
    }),
  }
}

export function bookingCancelledEmail(params: {
  customerName: string
  carName: string
  pickupDate: string
  tenantName: string
}): { subject: string; html: string } {
  return {
    subject: `Booking Cancelled: ${params.customerName} — ${params.carName}`,
    html: compactLayout({
      subheadline: params.tenantName,
      headline: 'Booking cancelled.',
      details: [
        { label: 'Customer', value: params.customerName },
        { label: 'Vehicle', value: params.carName },
        { label: 'Pickup Was', value: params.pickupDate },
      ],
      cta: { label: 'View Bookings', href: `${APP_URL}/dashboard/bookings` },
    }),
  }
}

export function agreementSignedOperatorEmail(params: {
  customerName: string
  tenantName: string
  carName: string
  pickupDate: string
  returnDate: string
  reservationId: number
  bookingCode?: string
}): { subject: string; html: string } {
  const fmt = (d: string) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'
  return {
    subject: `Agreement Signed: ${params.customerName} — ${params.carName}`,
    html: compactLayout({
      subheadline: params.tenantName,
      headline: 'Agreement signed.',
      body: `<strong>${params.customerName}</strong> has signed the rental agreement for <strong>${params.carName}</strong>.`,
      details: [
        { label: 'Customer', value: params.customerName },
        { label: 'Vehicle', value: params.carName },
        { label: 'Pickup', value: fmt(params.pickupDate) },
        { label: 'Return', value: fmt(params.returnDate) },
        { label: 'Signed At', value: new Date().toLocaleString('en-US') },
      ],
      cta: { label: 'View in Dashboard', href: `${APP_URL}/dashboard/bookings` },
    }),
  }
}

export function newInquiryEmail(params: {
  customerName: string
  customerEmail: string
  carName: string
  message: string
  tenantName: string
}): { subject: string; html: string } {
  return {
    subject: `New Inquiry: ${params.customerName} — ${params.carName}`,
    html: compactLayout({
      subheadline: params.tenantName,
      headline: 'New customer inquiry.',
      body: `Someone is interested in renting from ${params.tenantName}.`,
      details: [
        { label: 'Name', value: params.customerName },
        { label: 'Email', value: params.customerEmail },
        { label: 'Vehicle', value: params.carName },
      ],
      ...(params.message
        ? {
            note: `Message: "${params.message}"`,
          }
        : {}),
      cta: { label: 'Reply to Customer', href: `mailto:${params.customerEmail}` },
    }),
  }
}

// ─── Customer-facing ────────────────────────────────────────────────────────

export function agreementRequestEmail(params: {
  customerName: string
  brand: TenantBrand
  carName: string
  pickupDate: string
  returnDate: string
  agreementUrl: string
}): { subject: string; html: string } {
  const fmt = (d: string) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'
  return {
    subject: `Please Sign Your Rental Agreement — ${params.brand.name}`,
    html: tenantCompactLayout({
      brand: params.brand,
      subheadline: 'Action Required',
      headline: 'Sign your rental agreement.',
      body: `Hi ${params.customerName}, your rental is almost confirmed. Please review and sign the agreement to complete your booking with <strong>${params.brand.name}</strong>.`,
      details: [
        { label: 'Vehicle', value: params.carName },
        { label: 'Pickup', value: fmt(params.pickupDate) },
        { label: 'Return', value: fmt(params.returnDate) },
      ],
      cta: { label: 'Sign Agreement', href: params.agreementUrl },
      note: `Or copy this link: ${params.agreementUrl}`,
    }),
  }
}

export function agreementSignedCustomerEmail(params: {
  customerName: string
  brand: TenantBrand
  carName: string
  pickupDate: string
  returnDate: string
}): { subject: string; html: string } {
  const fmt = (d: string) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'
  return {
    subject: `Your Rental Agreement is Signed — ${params.brand.name}`,
    html: tenantCompactLayout({
      brand: params.brand,
      headline: 'Agreement signed.',
      body: `Hi ${params.customerName}, your rental agreement with <strong>${params.brand.name}</strong> has been signed. Please keep this email for your records.`,
      details: [
        { label: 'Vehicle', value: params.carName },
        { label: 'Pickup', value: fmt(params.pickupDate) },
        { label: 'Return', value: fmt(params.returnDate) },
        { label: 'Signed', value: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
      ],
      note: `If you have questions about your rental, please contact ${params.brand.name} directly.`,
    }),
  }
}

export function agreementClosedOutCustomerEmail(params: {
  customerName: string
  brand: TenantBrand
  carName: string
  totalAmount: number | null
  signedBy: string
}): { subject: string; html: string } {
  return {
    subject: `Your Rental Agreement is Finalized — ${params.brand.name}`,
    html: tenantCompactLayout({
      brand: params.brand,
      headline: 'Rental closed out.',
      body: `Hi ${params.customerName}, your rental agreement with <strong>${params.brand.name}</strong> has been finalized and countersigned by the operator. This is your final confirmation.`,
      details: [
        { label: 'Vehicle', value: params.carName },
        ...(params.totalAmount != null ? [{ label: 'Final Amount', value: `$${params.totalAmount.toLocaleString()}` }] : []),
        { label: 'Closed by', value: params.signedBy },
        { label: 'Date', value: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
      ],
      note: `This is the final version of your rental agreement. If you have questions, please contact ${params.brand.name} directly.`,
    }),
  }
}

export function bookingConfirmedCustomerEmail(params: {
  customerName: string
  brand: TenantBrand
  carName: string
  pickupDate: string
  returnDate: string
  pickupLocation: string
  reservationId: number
  bookingCode?: string
}): { subject: string; html: string } {
  const contactLine = [params.brand.phone, params.brand.email].filter(Boolean).join(' · ')
  return {
    subject: `Your booking is confirmed — ${params.brand.name}`,
    html: tenantCompactLayout({
      brand: params.brand,
      headline: 'Booking confirmed.',
      body: `Hi ${params.customerName}, your reservation with <strong>${params.brand.name}</strong> is confirmed. See you soon!`,
      details: [
        { label: 'Ref #', value: params.bookingCode || `#${params.reservationId}` },
        { label: 'Vehicle', value: params.carName },
        { label: 'Pickup', value: params.pickupDate },
        { label: 'Return', value: params.returnDate },
        { label: 'Location', value: params.pickupLocation || 'To be confirmed' },
      ],
      note: contactLine ? `Questions? Contact ${params.brand.name}: ${contactLine}` : undefined,
    }),
  }
}

export function bookingCancelledCustomerEmail(params: {
  customerName: string
  brand: TenantBrand
  carName: string
  pickupDate: string
}): { subject: string; html: string } {
  const contactLine = [params.brand.phone, params.brand.email].filter(Boolean).join(' · ')
  return {
    subject: `Your booking has been cancelled — ${params.brand.name}`,
    html: tenantCompactLayout({
      brand: params.brand,
      headline: 'Booking cancelled.',
      body: `Hi ${params.customerName}, your reservation with <strong>${params.brand.name}</strong> for the <strong>${params.carName}</strong> on ${params.pickupDate} has been cancelled.`,
      note: contactLine
        ? `Please reach out if you have questions: ${contactLine}`
        : 'Please reach out if you have questions.',
    }),
  }
}

export function bookingRejectedCustomerEmail(params: {
  customerName: string
  brand: TenantBrand
  carName: string
  tenantSlug: string
}): { subject: string; html: string } {
  return {
    subject: `Your booking request — ${params.brand.name}`,
    html: tenantCompactLayout({
      brand: params.brand,
      headline: 'Unable to accommodate.',
      body: `Hi ${params.customerName}, unfortunately <strong>${params.brand.name}</strong> is unable to accommodate your request for the <strong>${params.carName}</strong> at this time. We apologize for any inconvenience.`,
      cta: {
        label: 'Browse Available Vehicles',
        href: `https://${params.tenantSlug}.epuredrive.com`,
      },
    }),
  }
}

export function reviewRequestCustomerEmail(params: {
  customerName: string
  brand: TenantBrand
  carName: string
  tenantSlug: string
  reviewUrl?: string
}): { subject: string; html: string } {
  const href = params.reviewUrl || `https://${params.tenantSlug}.epuredrive.com`
  return {
    subject: `How was your rental with ${params.brand.name}?`,
    html: tenantCompactLayout({
      brand: params.brand,
      headline: 'How was your trip?',
      body: `Hi ${params.customerName}, we hope you enjoyed the <strong>${params.carName}</strong>. Your feedback helps <strong>${params.brand.name}</strong> and future renters. It only takes a minute.`,
      cta: { label: 'Leave a Review', href },
      note: `Thanks for choosing ${params.brand.name} — we hope to see you again soon.`,
    }),
  }
}

export function returnReminderCustomerEmail(params: {
  customerName: string
  brand: TenantBrand
  carName: string
  returnDate: string
  returnTime?: string | null
  returnLocation?: string | null
  bookingCode?: string | null
}): { subject: string; html: string } {
  const fmt = (d: string) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'
  const contactLine = [params.brand.phone, params.brand.email].filter(Boolean).join(' · ')
  return {
    subject: `Reminder: vehicle return tomorrow — ${params.brand.name}`,
    html: tenantCompactLayout({
      brand: params.brand,
      subheadline: 'Friendly reminder',
      headline: 'Your rental ends tomorrow.',
      body: `Hi ${params.customerName}, just a heads-up that your <strong>${params.carName}</strong> rental with <strong>${params.brand.name}</strong> is scheduled to be returned tomorrow.`,
      details: [
        ...(params.bookingCode ? [{ label: 'Ref #', value: params.bookingCode }] : []),
        { label: 'Vehicle', value: params.carName },
        { label: 'Return Date', value: fmt(params.returnDate) },
        ...(params.returnTime ? [{ label: 'Time', value: params.returnTime }] : []),
        ...(params.returnLocation ? [{ label: 'Location', value: params.returnLocation }] : []),
      ],
      note: contactLine
        ? `Need an extension or have questions? Contact ${params.brand.name}: ${contactLine}`
        : `Need an extension? Reach out to ${params.brand.name} as soon as possible.`,
    }),
  }
}

export function returnOverdueOperatorEmail(params: {
  tenantName: string
  rentals: Array<{
    customerName: string
    carName: string
    returnDate: string
    daysLate: number
    bookingCode?: string | null
    customerPhone?: string | null
    customerEmail?: string | null
  }>
}): { subject: string; html: string } {
  const fmt = (d: string) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : '—'

  const rows = params.rentals
    .map(
      (r) => `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #f5f5f5;font-size:13px;font-weight:600;color:#000;
               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${r.customerName}${r.bookingCode ? ` · <span style="color:#888;font-weight:500;">${r.bookingCode}</span>` : ''}</td>
    <td style="padding:10px 0;border-bottom:1px solid #f5f5f5;font-size:12px;color:#555;
               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${r.carName}</td>
    <td align="right" style="padding:10px 0;border-bottom:1px solid #f5f5f5;font-size:12px;font-weight:700;color:#cc0000;
               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      ${r.daysLate} day${r.daysLate === 1 ? '' : 's'} late · was ${fmt(r.returnDate)}
    </td>
  </tr>`
    )
    .join('')

  return {
    subject: `Overdue rentals — ${params.rentals.length} vehicle(s) — ${params.tenantName}`,
    html: compactLayout({
      subheadline: 'Return overdue',
      headline: `${params.rentals.length} rental${params.rentals.length !== 1 ? 's are' : ' is'} past return date.`,
      body: `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:8px;">
        <tr>
          <th align="left" style="padding:0 0 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#bbb;font-family:-apple-system,sans-serif;">Customer</th>
          <th align="left" style="padding:0 0 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#bbb;font-family:-apple-system,sans-serif;">Vehicle</th>
          <th align="right" style="padding:0 0 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#bbb;font-family:-apple-system,sans-serif;">Status</th>
        </tr>
        ${rows}
      </table>`,
      cta: { label: 'Open bookings', href: `${APP_URL}/dashboard/bookings` },
    }),
  }
}

export function maintenanceDueEmail(params: {
  tenantName: string
  vehicles: Array<{
    name: string
    serviceType: string
    dueDate: string
    isOverdue: boolean
  }>
}): { subject: string; html: string } {
  const overdueCount = params.vehicles.filter(v => v.isOverdue).length
  const subjectLine =
    overdueCount > 0
      ? `Maintenance overdue — ${overdueCount} vehicle(s) — ${params.tenantName}`
      : `Maintenance due — ${params.vehicles.length} vehicle(s) — ${params.tenantName}`

  const vehicleRows = params.vehicles
    .map(
      v => `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #f5f5f5;font-size:13px;font-weight:600;color:#000;
               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${v.name}</td>
    <td style="padding:10px 0;border-bottom:1px solid #f5f5f5;font-size:12px;color:#555;
               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${v.serviceType}</td>
    <td align="right"
        style="padding:10px 0;border-bottom:1px solid #f5f5f5;font-size:12px;font-weight:700;
               color:${v.isOverdue ? '#cc0000' : '#e67e00'};
               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      ${v.isOverdue ? 'OVERDUE' : 'Due'} ${v.dueDate}
    </td>
  </tr>`
    )
    .join('')

  return {
    subject: subjectLine,
    html: compactLayout({
      subheadline: 'Maintenance Alert',
      headline: `${params.vehicles.length} vehicle${params.vehicles.length !== 1 ? 's' : ''} require attention.`,
      body: `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:8px;">
        <tr>
          <th align="left" style="padding:0 0 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#bbb;font-family:-apple-system,sans-serif;">Vehicle</th>
          <th align="left" style="padding:0 0 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#bbb;font-family:-apple-system,sans-serif;">Service</th>
          <th align="right" style="padding:0 0 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#bbb;font-family:-apple-system,sans-serif;">Status</th>
        </tr>
        ${vehicleRows}
      </table>`,
      cta: { label: 'View Maintenance', href: 'https://epuredrive.com/dashboard/maintenance' },
    }),
  }
}
