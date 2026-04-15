// lib/email/templates/rentals.ts
import { compactLayout } from './_layout'

const APP_URL = 'https://epuredrive.com'

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
  tenantName: string
  carName: string
  pickupDate: string
  returnDate: string
  agreementUrl: string
}): { subject: string; html: string } {
  const fmt = (d: string) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'
  return {
    subject: `Please Sign Your Rental Agreement — ${params.tenantName}`,
    html: compactLayout({
      subheadline: 'Action Required',
      headline: 'Sign your rental agreement.',
      body: `Hi ${params.customerName}, your rental is almost confirmed. Please review and sign the agreement to complete your booking with <strong>${params.tenantName}</strong>.`,
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
  tenantName: string
  carName: string
  pickupDate: string
  returnDate: string
  tenantSlug: string
}): { subject: string; html: string } {
  const fmt = (d: string) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'
  return {
    subject: `Your Rental Agreement is Signed — ${params.tenantName}`,
    html: compactLayout({
      subheadline: params.tenantName,
      headline: 'Agreement signed.',
      body: `Hi ${params.customerName}, your rental agreement with <strong>${params.tenantName}</strong> has been signed. Please keep this email for your records.`,
      details: [
        { label: 'Vehicle', value: params.carName },
        { label: 'Pickup', value: fmt(params.pickupDate) },
        { label: 'Return', value: fmt(params.returnDate) },
        { label: 'Signed', value: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
      ],
      note: 'If you have questions about your rental, please contact the rental company directly.',
    }),
  }
}

export function bookingConfirmedCustomerEmail(params: {
  customerName: string
  tenantName: string
  carName: string
  pickupDate: string
  returnDate: string
  pickupLocation: string
  reservationId: number
  tenantPhone?: string | null
  tenantEmail?: string | null
}): { subject: string; html: string } {
  const contactLine = [params.tenantPhone, params.tenantEmail].filter(Boolean).join(' · ')
  return {
    subject: `Your booking is confirmed — ${params.tenantName}`,
    html: compactLayout({
      subheadline: params.tenantName,
      headline: 'Booking confirmed.',
      body: `Hi ${params.customerName}, your reservation is confirmed. See you soon!`,
      details: [
        { label: 'Ref #', value: `#${params.reservationId}` },
        { label: 'Vehicle', value: params.carName },
        { label: 'Pickup', value: params.pickupDate },
        { label: 'Return', value: params.returnDate },
        { label: 'Location', value: params.pickupLocation || 'To be confirmed' },
      ],
      note: contactLine ? `Questions? Contact ${params.tenantName}: ${contactLine}` : undefined,
    }),
  }
}

export function bookingCancelledCustomerEmail(params: {
  customerName: string
  tenantName: string
  carName: string
  pickupDate: string
  tenantPhone?: string | null
  tenantEmail?: string | null
}): { subject: string; html: string } {
  const contactLine = [params.tenantPhone, params.tenantEmail].filter(Boolean).join(' · ')
  return {
    subject: `Your booking has been cancelled — ${params.tenantName}`,
    html: compactLayout({
      subheadline: params.tenantName,
      headline: 'Booking cancelled.',
      body: `Hi ${params.customerName}, your reservation for the <strong>${params.carName}</strong> on ${params.pickupDate} has been cancelled.`,
      note: contactLine
        ? `Please reach out if you have questions: ${contactLine}`
        : 'Please reach out if you have questions.',
    }),
  }
}

export function bookingRejectedCustomerEmail(params: {
  customerName: string
  tenantName: string
  carName: string
  tenantSlug: string
}): { subject: string; html: string } {
  return {
    subject: `Your booking request — ${params.tenantName}`,
    html: compactLayout({
      subheadline: params.tenantName,
      headline: 'Unable to accommodate.',
      body: `Hi ${params.customerName}, unfortunately we're unable to accommodate your request for the <strong>${params.carName}</strong> at this time. We apologize for any inconvenience.`,
      cta: {
        label: 'Browse Available Vehicles',
        href: `https://${params.tenantSlug}.epuredrive.com`,
      },
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
