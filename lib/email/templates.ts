function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">éPure Drive</span>
    </div>
    <div style="background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;color:#fff;">
      ${content}
    </div>
    <div style="text-align:center;margin-top:24px;color:rgba(255,255,255,0.3);font-size:11px;">
      © ${new Date().getFullYear()} éPure Drive. All rights reserved.
    </div>
  </div>
</body>
</html>`
}

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
    html: baseLayout(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#fff;">New Booking Received</h2>
      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 24px;">A new reservation has been created for ${params.tenantName}.</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Customer</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;font-weight:600;">${params.customerName}</td></tr>
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Vehicle</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;font-weight:600;">${params.carName}</td></tr>
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Pickup</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;">${params.pickupDate}</td></tr>
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Return</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;">${params.returnDate}</td></tr>
        ${params.totalAmount != null ? `<tr><td style="padding:8px 0;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Total</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;font-weight:700;">$${params.totalAmount.toLocaleString()}</td></tr>` : ''}
      </table>
      <div style="margin-top:24px;text-align:center;">
        <a href="https://epuredrive.com/dashboard/bookings" style="display:inline-block;background:#fff;color:#000;padding:12px 32px;border-radius:12px;text-decoration:none;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">View Booking</a>
      </div>
    `),
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
    html: baseLayout(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#fff;">Booking Cancelled</h2>
      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 24px;">A reservation has been cancelled for ${params.tenantName}.</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Customer</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;font-weight:600;">${params.customerName}</td></tr>
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Vehicle</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;font-weight:600;">${params.carName}</td></tr>
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Pickup Was</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;">${params.pickupDate}</td></tr>
      </table>
      <div style="margin-top:24px;text-align:center;">
        <a href="https://epuredrive.com/dashboard/bookings" style="display:inline-block;background:#fff;color:#000;padding:12px 32px;border-radius:12px;text-decoration:none;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">View Bookings</a>
      </div>
    `),
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
  const pickupFormatted = params.pickupDate
    ? new Date(params.pickupDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—'
  const returnFormatted = params.returnDate
    ? new Date(params.returnDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—'

  return {
    subject: `Your Rental Agreement is Signed — ${params.tenantName}`,
    html: baseLayout(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#fff;">Agreement Signed Successfully</h2>
      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 24px;">
        Hi ${params.customerName}, your rental agreement with <strong style="color:#fff;">${params.tenantName}</strong> has been signed. Please keep this email for your records.
      </p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Vehicle</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;font-weight:600;">${params.carName}</td></tr>
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Pickup</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;">${pickupFormatted}</td></tr>
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Return</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;">${returnFormatted}</td></tr>
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Signed</td><td style="padding:8px 0;color:#00d2ff;font-size:14px;text-align:right;font-weight:700;">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td></tr>
      </table>
      <div style="margin-top:24px;padding:16px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.06);">
        <p style="margin:0;color:rgba(255,255,255,0.5);font-size:12px;line-height:1.6;">
          Your signed PDF agreement will be available shortly. If you have any questions about your rental, please contact ${params.tenantName} directly.
        </p>
      </div>
    `),
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
  const pickupFormatted = params.pickupDate
    ? new Date(params.pickupDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—'
  const returnFormatted = params.returnDate
    ? new Date(params.returnDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—'

  return {
    subject: `Agreement Signed: ${params.customerName} — ${params.carName}`,
    html: baseLayout(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#fff;">Rental Agreement Signed</h2>
      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 24px;">
        <strong style="color:#fff;">${params.customerName}</strong> has signed the rental agreement for <strong style="color:#fff;">${params.carName}</strong>.
      </p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Customer</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;font-weight:600;">${params.customerName}</td></tr>
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Vehicle</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;font-weight:600;">${params.carName}</td></tr>
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Pickup</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;">${pickupFormatted}</td></tr>
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Return</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;">${returnFormatted}</td></tr>
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Signed At</td><td style="padding:8px 0;color:#00d2ff;font-size:14px;text-align:right;font-weight:700;">${new Date().toLocaleString('en-US')}</td></tr>
      </table>
      <div style="margin-top:24px;text-align:center;">
        <a href="https://epuredrive.com/dashboard/bookings" style="display:inline-block;background:#fff;color:#000;padding:12px 32px;border-radius:12px;text-decoration:none;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">View in Dashboard</a>
      </div>
    `),
  }
}

export function agreementRequestEmail(params: {
  customerName: string
  tenantName: string
  carName: string
  pickupDate: string
  returnDate: string
  agreementUrl: string
}): { subject: string; html: string } {
  const pickupFormatted = params.pickupDate
    ? new Date(params.pickupDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—'
  const returnFormatted = params.returnDate
    ? new Date(params.returnDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—'

  return {
    subject: `Please Sign Your Rental Agreement — ${params.tenantName}`,
    html: baseLayout(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#fff;">Action Required: Sign Your Rental Agreement</h2>
      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 24px;">
        Hi ${params.customerName}, your rental is almost confirmed! Please review and sign the agreement below to complete your booking with <strong style="color:#fff;">${params.tenantName}</strong>.
      </p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Vehicle</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;font-weight:600;">${params.carName}</td></tr>
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Pickup</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;">${pickupFormatted}</td></tr>
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Return</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;">${returnFormatted}</td></tr>
      </table>
      <div style="margin-top:28px;text-align:center;">
        <a href="${params.agreementUrl}" style="display:inline-block;background:#00d2ff;color:#000;padding:14px 36px;border-radius:12px;text-decoration:none;font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:2px;">Sign Agreement</a>
      </div>
      <p style="margin-top:20px;color:rgba(255,255,255,0.3);font-size:11px;text-align:center;">
        Or copy this link: ${params.agreementUrl}
      </p>
    `),
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
    html: baseLayout(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#fff;">New Customer Inquiry</h2>
      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 24px;">Someone is interested in renting from ${params.tenantName}.</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Name</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;font-weight:600;">${params.customerName}</td></tr>
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Email</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;">${params.customerEmail}</td></tr>
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Vehicle</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;font-weight:600;">${params.carName}</td></tr>
      </table>
      ${params.message ? `<div style="margin-top:16px;padding:16px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.06);color:rgba(255,255,255,0.7);font-size:13px;line-height:1.6;">${params.message}</div>` : ''}
      <div style="margin-top:24px;text-align:center;">
        <a href="mailto:${params.customerEmail}" style="display:inline-block;background:#fff;color:#000;padding:12px 32px;border-radius:12px;text-decoration:none;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Reply to Customer</a>
      </div>
    `),
  }
}
