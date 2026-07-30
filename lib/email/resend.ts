import { Resend } from 'resend'

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'notifications@epuredrive.com'

export interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  cc?: string | string[]
  replyTo?: string
  /** Display name shown in the "From" header. The verified sender address stays the same. */
  fromName?: string
}

function sanitizeFromName(name: string): string {
  return name.replace(/["\\<>\n\r]/g, '').trim().slice(0, 60)
}

export async function sendEmail({ to, subject, html, cc, replyTo, fromName }: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping email send')
    return { error: 'Email not configured' }
  }

  const resend = new Resend(apiKey)
  const safeName = fromName ? sanitizeFromName(fromName) : ''
  const from = safeName ? `${safeName} <${FROM_EMAIL}>` : FROM_EMAIL
  const ccList = cc ? (Array.isArray(cc) ? cc : [cc]) : undefined

  const { error } = await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    cc: ccList,
    subject,
    html,
    replyTo,
  })

  if (error) {
    console.error('[email] Send failed:', error)
    return { error: error.message }
  }

  return { error: null }
}
