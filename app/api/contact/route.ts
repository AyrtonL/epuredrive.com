// app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/resend'
import {
  enterpriseInquiryAdminEmail,
  enterpriseInquiryConfirmEmail,
} from '@/lib/email/templates/support'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Simple in-memory rate limit: 3 submissions per IP per hour
const rateLimitStore = new Map<string, number[]>()

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for') ??
    request.headers.get('x-real-ip') ??
    'unknown'
  const now = Date.now()
  const windowMs = 60 * 60 * 1000 // 1 hour
  const timestamps = (rateLimitStore.get(ip) ?? []).filter(t => now - t < windowMs)
  if (timestamps.length >= 3) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  rateLimitStore.set(ip, [...timestamps, now])

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const data = body as Record<string, unknown>
  const name = typeof data.name === 'string' ? data.name.trim().slice(0, 200) : ''
  const email = typeof data.email === 'string' ? data.email.trim().slice(0, 200) : ''
  const company =
    typeof data.company === 'string' ? data.company.trim().slice(0, 200) : undefined
  const inquiryType =
    typeof data.inquiryType === 'string' ? data.inquiryType.trim() : 'General Inquiry'
  const message = typeof data.message === 'string' ? data.message.trim().slice(0, 2000) : ''

  if (!name || !email || !EMAIL_REGEX.test(email) || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL
  if (!adminEmail) {
    return NextResponse.json({ error: 'Contact not configured' }, { status: 500 })
  }

  await Promise.allSettled([
    sendEmail({
      to: adminEmail,
      replyTo: email,
      ...enterpriseInquiryAdminEmail({ name, email, company, inquiryType, message }),
    }),
    sendEmail({
      to: email,
      ...enterpriseInquiryConfirmEmail({ name }),
    }),
  ])

  return NextResponse.json({ success: true })
}
