import { Resend } from 'resend'

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'notifications@epuredrive.com'

export interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

export async function sendEmail({ to, subject, html, replyTo }: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping email send')
    return { error: 'Email not configured' }
  }

  const resend = new Resend(apiKey)

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: Array.isArray(to) ? to : [to],
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
