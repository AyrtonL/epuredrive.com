// lib/email/templates/_layout.ts

const APP_URL = 'https://epuredrive.com'
const ASSETS = `${APP_URL}/assets/email`
export const LOGO_BLACK = `${ASSETS}/logo-black.png`
export const CAR = (n: number) => `${ASSETS}/car-${n}.jpg`

function wrapper(inner: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
</head>
<body style="margin:0;padding:0;background:#f2f2f2;-webkit-text-size-adjust:100%;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f2f2f2;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation"
             style="max-width:600px;width:100%;background:#ffffff;">
        ${inner}
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function header(): string {
  return `<tr>
  <td style="padding:24px 32px;border-bottom:1px solid #f0f0f0;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td>
          <img src="${LOGO_BLACK}" width="110" height="auto" alt="éPure Drive"
               style="display:block;border:0;max-width:110px;"/>
        </td>
        <td align="right"
            style="font-size:10px;color:#bbb;letter-spacing:0.12em;text-transform:uppercase;
                   font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          epuredrive.com
        </td>
      </tr>
    </table>
  </td>
</tr>`
}

function footer(): string {
  return `<tr>
  <td style="padding:16px 32px;border-top:1px solid #f0f0f0;">
    <p style="margin:0;font-size:10px;color:#ccc;
              font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      © ${new Date().getFullYear()} éPure Drive &nbsp;·&nbsp; epuredrive.com &nbsp;·&nbsp; info@epuredrive.com
    </p>
  </td>
</tr>`
}

export function ctaButton(label: string, href: string): string {
  return `<a href="${href}"
     style="display:inline-block;background:#000000;color:#ffffff;
            padding:13px 28px;border-radius:100px;text-decoration:none;
            font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;
            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  ${label}
</a>`
}

export function detailRow(label: string, value: string): string {
  return `<tr>
  <td style="padding:9px 0;font-size:10px;font-weight:700;text-transform:uppercase;
             letter-spacing:0.15em;color:#aaa;border-bottom:1px solid #f5f5f5;width:42%;
             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${label}</td>
  <td style="padding:9px 0;font-size:13px;font-weight:600;color:#111;
             text-align:right;border-bottom:1px solid #f5f5f5;
             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${value}</td>
</tr>`
}

export interface HeroLayoutParams {
  subheadline?: string
  headline: string
  body: string
  cta?: { label: string; href: string }
  carImageUrl: string
}

/** Split layout: content left (310px) | car image right (290px) */
export function heroLayout(p: HeroLayoutParams): string {
  return wrapper(`
    ${header()}
    <tr>
      <td style="padding:0;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td width="310" valign="top"
                style="padding:44px 32px 44px 32px;vertical-align:top;">
              ${p.subheadline
                ? `<p style="margin:0 0 14px;font-size:10px;font-weight:700;text-transform:uppercase;
                            letter-spacing:0.25em;color:#aaa;
                            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                     ${p.subheadline}
                   </p>`
                : ''}
              <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#000;
                         line-height:1.15;letter-spacing:-0.02em;
                         font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                ${p.headline}
              </h1>
              <div style="font-size:14px;color:#555;line-height:1.7;margin-bottom:32px;
                          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                ${p.body}
              </div>
              ${p.cta ? ctaButton(p.cta.label, p.cta.href) : ''}
            </td>
            <td width="290" valign="top" style="vertical-align:top;overflow:hidden;padding:0;">
              <img src="${p.carImageUrl}" width="290" height="380" alt=""
                   style="display:block;width:290px;height:380px;
                          object-fit:cover;object-position:center;border:0;"/>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${footer()}
  `)
}

export interface CompactLayoutParams {
  subheadline?: string
  headline: string
  body?: string
  details?: Array<{ label: string; value: string }>
  cta?: { label: string; href: string }
  note?: string
}

/** Single-column compact layout for transactional emails */
export function compactLayout(p: CompactLayoutParams): string {
  const detailsHtml = p.details?.length
    ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"
              style="margin:24px 0;">
         ${p.details.map(d => detailRow(d.label, d.value)).join('\n')}
       </table>`
    : ''

  return wrapper(`
    ${header()}
    <tr>
      <td style="padding:40px 32px 36px;">
        ${p.subheadline
          ? `<p style="margin:0 0 10px;font-size:10px;font-weight:700;text-transform:uppercase;
                      letter-spacing:0.25em;color:#aaa;
                      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
               ${p.subheadline}
             </p>`
          : ''}
        <h1 style="margin:0 0 16px;font-size:24px;font-weight:900;color:#000;
                   line-height:1.2;letter-spacing:-0.02em;
                   font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          ${p.headline}
        </h1>
        ${p.body
          ? `<p style="margin:0;font-size:14px;color:#555;line-height:1.7;
                      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
               ${p.body}
             </p>`
          : ''}
        ${detailsHtml}
        ${p.cta ? `<div style="margin-top:28px;">${ctaButton(p.cta.label, p.cta.href)}</div>` : ''}
        ${p.note
          ? `<p style="margin-top:24px;font-size:11px;color:#aaa;line-height:1.65;
                      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
               ${p.note}
             </p>`
          : ''}
      </td>
    </tr>
    ${footer()}
  `)
}
