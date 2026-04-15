/* eslint-disable no-console */
import { readFileSync } from 'node:fs'
import { Resend } from 'resend'
import { agreementRequestEmail } from '../lib/email/templates/rentals'
import type { TenantBrand } from '../lib/email/templates/_layout'

function loadEnv() {
  const content = readFileSync('.env.local', 'utf8')
  for (const line of content.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (!process.env[k]) process.env[k] = v
  }
}

async function main() {
  loadEnv()

  const token = process.argv[2]
  const to = process.argv[3]
  if (!token || !to) {
    console.error('Usage: npx tsx scripts/send-agreement-test.ts <token> <to-email>')
    process.exit(1)
  }

  const brand: TenantBrand = {
    name: 'éPure Drive',
    logoUrl: null,
    email: 'info@epuredrive.com',
    phone: null,
    address: null,
  }

  const agreementUrl = `https://epuredrive.com/sites/epurerental/agreement/${token}`

  const { subject, html } = agreementRequestEmail({
    customerName: 'Ayrton',
    brand,
    carName: 'Audi Q3 2.0 FWD',
    pickupDate: '2026-05-01',
    returnDate: '2026-05-05',
    agreementUrl,
  })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('RESEND_API_KEY not set')
    process.exit(1)
  }
  const from = process.env.RESEND_FROM_EMAIL || 'notifications@epuredrive.com'
  const senderAddress = from.match(/<([^>]+)>/)?.[1] ?? from
  const fromHeader = `éPure Drive <${senderAddress}>`

  const resend = new Resend(apiKey)
  const result = await resend.emails.send({
    from: fromHeader,
    to: [to],
    subject,
    html,
    replyTo: brand.email ?? undefined,
  })

  console.log(JSON.stringify(result, null, 2))
  console.log('\nAgreement URL:', agreementUrl)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
