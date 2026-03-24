exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const {
        reservationId,
        customerName,
        customerEmail,
        carName,
        pickupDate,
        returnDate,
        bookingDays,
        location,
        total,
        coverage,
        extras,
    } = JSON.parse(event.body || '{}');

    if (!customerEmail || !reservationId) {
        return { statusCode: 400, body: 'Missing required fields' };
    }

    const confirmationUrl = `https://epuredrive.com/booking-confirmation.html?id=${reservationId}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#0a0a0a;padding:32px 40px;text-align:center;">
            <div style="font-size:22px;font-weight:700;letter-spacing:3px;color:#ffffff;text-transform:uppercase;">ÉPURE DRIVE</div>
            <div style="font-size:12px;color:#b8943f;letter-spacing:2px;margin-top:6px;text-transform:uppercase;">Luxury Car Rental · Miami</div>
          </td>
        </tr>

        <!-- Banner -->
        <tr>
          <td style="background:#b8943f;padding:16px 40px;text-align:center;">
            <div style="font-size:14px;font-weight:600;color:#ffffff;letter-spacing:1px;text-transform:uppercase;">Booking Confirmed</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 24px;font-size:16px;color:#1a1a1a;">Hello <strong>${customerName}</strong>,</p>
            <p style="margin:0 0 32px;font-size:15px;color:#444;line-height:1.6;">
              Your reservation is confirmed and your vehicle will be ready for you. Here are your booking details:
            </p>

            <!-- Booking Details Card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:6px;border:1px solid #e8e8e8;margin-bottom:32px;">
              <tr>
                <td style="padding:24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #ececec;">
                        <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Reservation ID</span>
                        <div style="font-size:14px;font-weight:600;color:#1a1a1a;margin-top:2px;font-family:monospace;">#${reservationId}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:12px 0;border-bottom:1px solid #ececec;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td width="50%" style="vertical-align:top;">
                              <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Vehicle</span>
                              <div style="font-size:15px;font-weight:600;color:#1a1a1a;margin-top:2px;">${carName}</div>
                            </td>
                            <td width="50%" style="vertical-align:top;">
                              <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Coverage</span>
                              <div style="font-size:14px;color:#1a1a1a;margin-top:2px;">${coverage}</div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:12px 0;border-bottom:1px solid #ececec;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td width="50%" style="vertical-align:top;">
                              <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Pick-up Date</span>
                              <div style="font-size:14px;font-weight:600;color:#1a1a1a;margin-top:2px;">${pickupDate}</div>
                            </td>
                            <td width="50%" style="vertical-align:top;">
                              <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Return Date</span>
                              <div style="font-size:14px;font-weight:600;color:#1a1a1a;margin-top:2px;">${returnDate}</div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:12px 0;border-bottom:1px solid #ececec;">
                        <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Pick-up Location</span>
                        <div style="font-size:14px;color:#1a1a1a;margin-top:2px;">${location}</div>
                      </td>
                    </tr>
                    ${extras && extras !== 'None' ? `<tr>
                      <td style="padding:12px 0;border-bottom:1px solid #ececec;">
                        <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Add-ons</span>
                        <div style="font-size:14px;color:#1a1a1a;margin-top:2px;">${extras}</div>
                      </td>
                    </tr>` : ''}
                    <tr>
                      <td style="padding:12px 0 0;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td>
                              <span style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Duration</span>
                              <div style="font-size:14px;color:#1a1a1a;margin-top:2px;">${bookingDays} day${bookingDays !== 1 ? 's' : ''}</div>
                            </td>
                            <td style="text-align:right;">
                              <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Total Charged</span>
                              <div style="font-size:22px;font-weight:700;color:#b8943f;margin-top:2px;">$${Number(total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td align="center">
                  <a href="${confirmationUrl}" style="display:inline-block;background:#b8943f;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:4px;font-size:14px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">View Booking Details</a>
                </td>
              </tr>
            </table>

            <!-- What's next -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:6px;border:1px solid #e8e8e8;margin-bottom:32px;">
              <tr>
                <td style="padding:20px 24px;">
                  <div style="font-size:13px;font-weight:600;color:#1a1a1a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">What to bring on pick-up day</div>
                  <table cellpadding="0" cellspacing="0">
                    <tr><td style="padding:3px 0;font-size:13px;color:#555;">&#10003;&nbsp; Valid driver's license</td></tr>
                    <tr><td style="padding:3px 0;font-size:13px;color:#555;">&#10003;&nbsp; Major credit card in your name</td></tr>
                    <tr><td style="padding:3px 0;font-size:13px;color:#555;">&#10003;&nbsp; This confirmation email or booking ID</td></tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:14px;color:#555;line-height:1.6;">
              Questions? Reply to this email or reach us on WhatsApp at <a href="https://wa.me/17862096770" style="color:#b8943f;text-decoration:none;">+1 (786) 209-6770</a>.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0a0a0a;padding:24px 40px;text-align:center;">
            <div style="font-size:12px;color:#666;line-height:1.6;">
              ÉPURE DRIVE &nbsp;·&nbsp; Miami, FL<br>
              <a href="https://epuredrive.com" style="color:#b8943f;text-decoration:none;">epuredrive.com</a>
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: 'ÉPure Drive <reservations@epuredrive.com>',
            to: customerEmail,
            subject: `Booking Confirmed – ${carName} · #${reservationId}`,
            html,
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        console.error('Resend error:', err);
        return { statusCode: 500, body: 'Email delivery failed' };
    }

    return { statusCode: 200, body: 'OK' };
};
