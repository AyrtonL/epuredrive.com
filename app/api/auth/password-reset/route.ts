/**
 * POST /api/auth/password-reset
 * Public route — sends a branded password reset email via Resend.
 * Replaces Supabase's default generic recovery email.
 *
 * Always returns success to avoid leaking which emails are registered.
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { passwordResetEmail } from '@/lib/email/templates/platform'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://epuredrive.com'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email } = (body ?? {}) as { email?: string }
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // generateLink returns the action_link without sending Supabase's default email.
  // If the email isn't registered, this errors silently — we still return success.
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${APP_URL}/reset-password`,
    },
  })

  if (!linkError && linkData) {
    const resetUrl = (linkData as { properties?: { action_link?: string } }).properties?.action_link
    if (resetUrl) {
      await sendEmail({
        to: email,
        ...passwordResetEmail({ resetUrl }),
      }).catch(() => {}) // non-blocking
    }
  }

  // Always succeed — never reveal whether the email is registered.
  return NextResponse.json({ success: true })
}
