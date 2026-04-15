/* eslint-disable no-console */
/**
 * Manual test harness for transactional emails.
 *
 * Usage:
 *   npx tsx scripts/test-emails.ts <to-email> [--only=welcome,passwordReset,...]
 *
 * Loads RESEND_API_KEY + RESEND_FROM_EMAIL from .env.local, then sends a
 * representative sample of each template to the provided address.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Resend } from 'resend'

import {
  welcomeEmail,
  onboardingEmail,
  subscriptionActivatedEmail,
  paymentReceiptEmail,
  paymentFailedEmail,
  teamInviteEmail,
  teamInviteAcceptedEmail,
  passwordResetEmail,
  passwordChangedEmail,
  planLimitWarningEmail,
} from '../lib/email/templates/platform'
import {
  bookingConfirmedCustomerEmail,
  bookingCancelledCustomerEmail,
  bookingRejectedCustomerEmail,
  agreementRequestEmail,
  agreementSignedCustomerEmail,
  reviewRequestCustomerEmail,
  maintenanceDueEmail,
  newBookingEmail,
} from '../lib/email/templates/rentals'
import {
  dashboardSupportConfirmEmail,
} from '../lib/email/templates/support'
import type { TenantBrand } from '../lib/email/templates/_layout'

const SAMPLE_BRAND: TenantBrand = {
  name: 'Sample Rentals',
  logoUrl: null,
  email: 'info@example.com',
  phone: '+1 (555) 555-0101',
  address: null,
}

function loadEnvLocal() {
  const path = join(process.cwd(), '.env.local')
  try {
    const content = readFileSync(path, 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // ignore — user may rely on ambient env
  }
}

interface TemplatePayload {
  subject: string
  html: string
}

interface TestCase {
  name: string
  build: () => TemplatePayload
  fromName?: string
}

const TENANT_FROM_NAME = SAMPLE_BRAND.name

function makeCases(): TestCase[] {
  return [
    { name: 'welcome', build: () => welcomeEmail({ operatorName: 'Test Operator' }) },
    { name: 'onboarding', build: () => onboardingEmail({ operatorName: 'Test Operator' }) },
    {
      name: 'subscriptionActivated',
      build: () =>
        subscriptionActivatedEmail({
          operatorName: 'Test Operator',
          plan: 'pro',
          billingDate: 'May 15, 2026',
        }),
    },
    {
      name: 'paymentReceipt',
      build: () =>
        paymentReceiptEmail({
          operatorName: 'Test Operator',
          plan: 'pro',
          amount: '$49.00',
          billingDate: 'April 15, 2026',
          last4: '4242',
        }),
    },
    {
      name: 'paymentFailed',
      build: () =>
        paymentFailedEmail({
          operatorName: 'Test Operator',
          amount: '$49.00',
          reason: 'card_declined',
        }),
    },
    {
      name: 'teamInvite',
      build: () =>
        teamInviteEmail({
          invitedBy: 'Ayrton',
          companyName: 'éPure Drive',
          role: 'Manager',
          inviteUrl: 'https://epuredrive.com/invite/sample-token',
        }),
    },
    {
      name: 'teamInviteAccepted',
      build: () =>
        teamInviteAcceptedEmail({
          inviterName: 'Ayrton',
          memberName: 'Jane Doe',
          memberEmail: 'jane@example.com',
          role: 'manager',
          companyName: 'éPure Drive',
        }),
    },
    {
      name: 'passwordReset',
      build: () =>
        passwordResetEmail({
          resetUrl: 'https://epuredrive.com/reset-password?token=sample',
        }),
    },
    {
      name: 'passwordChanged',
      build: () => passwordChangedEmail({ when: 'April 15, 2026 at 3:45 PM EDT' }),
    },
    {
      name: 'planLimitWarning',
      build: () =>
        planLimitWarningEmail({
          operatorName: 'Test Operator',
          plan: 'starter',
          currentCount: 4,
          limit: 5,
        }),
    },
    {
      name: 'bookingConfirmedCustomer',
      fromName: TENANT_FROM_NAME,
      build: () =>
        bookingConfirmedCustomerEmail({
          customerName: 'John Renter',
          brand: SAMPLE_BRAND,
          carName: 'Tesla Model 3',
          pickupDate: 'April 20, 2026',
          returnDate: 'April 25, 2026',
          pickupLocation: 'Downtown Pickup Point',
          reservationId: 1042,
        }),
    },
    {
      name: 'bookingCancelledCustomer',
      fromName: TENANT_FROM_NAME,
      build: () =>
        bookingCancelledCustomerEmail({
          customerName: 'John Renter',
          brand: SAMPLE_BRAND,
          carName: 'Tesla Model 3',
          pickupDate: 'April 20, 2026',
        }),
    },
    {
      name: 'bookingRejectedCustomer',
      fromName: TENANT_FROM_NAME,
      build: () =>
        bookingRejectedCustomerEmail({
          customerName: 'John Renter',
          brand: SAMPLE_BRAND,
          carName: 'Tesla Model 3',
          tenantSlug: 'sample',
        }),
    },
    {
      name: 'agreementRequest',
      fromName: TENANT_FROM_NAME,
      build: () =>
        agreementRequestEmail({
          customerName: 'John Renter',
          brand: SAMPLE_BRAND,
          carName: 'Tesla Model 3',
          pickupDate: '2026-04-20',
          returnDate: '2026-04-25',
          agreementUrl: 'https://sample.epuredrive.com/agreement/sample-token',
        }),
    },
    {
      name: 'agreementSignedCustomer',
      fromName: TENANT_FROM_NAME,
      build: () =>
        agreementSignedCustomerEmail({
          customerName: 'John Renter',
          brand: SAMPLE_BRAND,
          carName: 'Tesla Model 3',
          pickupDate: '2026-04-20',
          returnDate: '2026-04-25',
        }),
    },
    {
      name: 'reviewRequestCustomer',
      fromName: TENANT_FROM_NAME,
      build: () =>
        reviewRequestCustomerEmail({
          customerName: 'John Renter',
          brand: SAMPLE_BRAND,
          carName: 'Tesla Model 3',
          tenantSlug: 'sample',
        }),
    },
    {
      name: 'maintenanceDue',
      build: () =>
        maintenanceDueEmail({
          tenantName: 'Sample Rentals',
          vehicles: [
            { name: 'Tesla Model 3', serviceType: 'Oil change', dueDate: 'Apr 20', isOverdue: false },
            { name: 'BMW M4', serviceType: 'Tire rotation', dueDate: 'Apr 10', isOverdue: true },
          ],
        }),
    },
    {
      name: 'newBooking',
      build: () =>
        newBookingEmail({
          customerName: 'John Renter',
          carName: 'Tesla Model 3',
          pickupDate: 'April 20, 2026',
          returnDate: 'April 25, 2026',
          totalAmount: 1250,
          tenantName: 'Sample Rentals',
        }),
    },
    {
      name: 'dashboardSupportConfirm',
      build: () =>
        dashboardSupportConfirmEmail({
          ticketNumber: 'EPD-01000',
          operatorName: 'Test Operator',
          subject: 'Test support request',
        }),
    },
  ]
}

async function main() {
  loadEnvLocal()

  const to = process.argv[2]
  if (!to || !to.includes('@')) {
    console.error('Usage: npx tsx scripts/test-emails.ts <to-email> [--only=name1,name2]')
    process.exit(1)
  }

  const onlyArg = process.argv.find((a) => a.startsWith('--only='))
  const only = onlyArg ? onlyArg.split('=')[1].split(',') : null

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set in .env.local')
    process.exit(1)
  }
  const from = process.env.RESEND_FROM_EMAIL || 'notifications@epuredrive.com'
  const resend = new Resend(apiKey)

  const cases = makeCases().filter((c) => !only || only.includes(c.name))

  console.log(`Sending ${cases.length} test emails to ${to} from ${from}`)
  console.log('─'.repeat(60))

  let ok = 0
  let fail = 0
  for (const c of cases) {
    try {
      const { subject, html } = c.build()
      const senderAddress = from.match(/<([^>]+)>/)?.[1] ?? from
      const fromHeader = c.fromName
        ? `${c.fromName.replace(/["\\<>\n\r]/g, '').trim()} <${senderAddress}>`
        : from
      const result = await resend.emails.send({
        from: fromHeader,
        to: [to],
        subject: `[TEST] ${subject}`,
        html,
      })
      if (result.error) {
        fail++
        console.log(`✗ ${c.name.padEnd(30)} ${result.error.message}`)
      } else {
        ok++
        console.log(`✓ ${c.name.padEnd(30)} ${result.data?.id ?? ''}`)
      }
    } catch (err) {
      fail++
      console.log(`✗ ${c.name.padEnd(30)} ${err instanceof Error ? err.message : String(err)}`)
    }
    await new Promise((r) => setTimeout(r, 200))
  }

  console.log('─'.repeat(60))
  console.log(`Sent: ${ok}  Failed: ${fail}  Total: ${cases.length}`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
