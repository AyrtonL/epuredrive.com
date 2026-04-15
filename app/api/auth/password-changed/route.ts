/**
 * POST /api/auth/password-changed
 * Authenticated route — sends the "your password was changed" security email
 * to the currently signed-in user. Called after a successful updateUser({ password }).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend'
import { passwordChangedEmail } from '@/lib/email/templates/platform'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const when = new Date().toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
  }) + ' UTC'

  await sendEmail({
    to: user.email,
    ...passwordChangedEmail({ when }),
  }).catch(() => {}) // non-blocking

  return NextResponse.json({ success: true })
}
