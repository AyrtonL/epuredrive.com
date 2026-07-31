/**
 * @jest-environment node
 *
 * Bouncie has no HMAC signature scheme — it echoes the configured authKey
 * verbatim in the Authorization / X-Bouncie-Authorization headers.
 * verifyWebhookAuth() is a constant-time string compare against
 * BOUNCIE_WEBHOOK_SECRET, not a digest.
 */
import { BouncieProvider } from '@/lib/telematics/bouncie'

describe('BouncieProvider.verifyWebhookAuth', () => {
  const secret = 'test-auth-key'

  beforeEach(() => {
    process.env.BOUNCIE_WEBHOOK_SECRET = secret
  })

  test('accepts a header matching the configured authKey', () => {
    expect(new BouncieProvider().verifyWebhookAuth(secret)).toBe(true)
  })

  test('rejects a wrong key', () => {
    expect(new BouncieProvider().verifyWebhookAuth('wrong-key')).toBe(false)
  })

  test('rejects a key of different length (no timing-safe crash)', () => {
    expect(new BouncieProvider().verifyWebhookAuth(secret + 'x')).toBe(false)
    expect(new BouncieProvider().verifyWebhookAuth('short')).toBe(false)
  })

  test('rejects null header', () => {
    expect(new BouncieProvider().verifyWebhookAuth(null)).toBe(false)
  })

  test('rejects empty string header', () => {
    expect(new BouncieProvider().verifyWebhookAuth('')).toBe(false)
  })
})
