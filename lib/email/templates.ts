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
