/**
 * @jest-environment node
 */
import crypto from 'node:crypto'
import { BouncieProvider } from '@/lib/telematics/bouncie'

describe('BouncieProvider.verifyWebhookSignature', () => {
  const secret = 'test-secret'
  const body = JSON.stringify({ eventType: 'trip_end', imei: '123', timestamp: '2026-04-23T12:00:00Z' })
  const validSig = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')

  beforeEach(() => { process.env.BOUNCIE_WEBHOOK_SECRET = secret })

  test('accepts valid signature', () => {
    expect(new BouncieProvider().verifyWebhookSignature(body, validSig)).toBe(true)
  })

  test('rejects tampered body', () => {
    expect(new BouncieProvider().verifyWebhookSignature(body + 'x', validSig)).toBe(false)
  })

  test('rejects wrong signature', () => {
    expect(new BouncieProvider().verifyWebhookSignature(body, 'sha256=' + 'd'.repeat(64))).toBe(false)
  })

  test('rejects null signature header', () => {
    expect(new BouncieProvider().verifyWebhookSignature(body, null)).toBe(false)
  })

  test('rejects missing sha256= prefix', () => {
    const bareHex = validSig.slice('sha256='.length)
    expect(new BouncieProvider().verifyWebhookSignature(body, bareHex)).toBe(false)
  })

  test('rejects malformed hex signatures (security finding #15)', () => {
    const p = new BouncieProvider()
    expect(p.verifyWebhookSignature(body, 'sha256=')).toBe(false)
    expect(p.verifyWebhookSignature(body, 'sha256=xyz!@#')).toBe(false)
    expect(p.verifyWebhookSignature(body, 'sha256=' + 'a'.repeat(63))).toBe(false)
    expect(p.verifyWebhookSignature(body, 'sha256=' + 'a'.repeat(65))).toBe(false)
  })
})
