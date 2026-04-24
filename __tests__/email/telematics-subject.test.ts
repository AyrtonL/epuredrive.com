/**
 * @jest-environment node
 */
import { sanitizeSubject } from '@/lib/email/telematics'

describe('sanitizeSubject (HIGH #3 — email header injection guard)', () => {
  test('strips CRLF injection attempts', () => {
    const malicious = 'DTC P0420\nBcc: attacker@evil.com'
    const cleaned = sanitizeSubject(malicious)
    expect(cleaned).not.toMatch(/[\r\n]/)
    expect(cleaned).toBe('DTC P0420 Bcc: attacker@evil.com')
  })

  test('strips bare CR and CRLF sequences too', () => {
    expect(sanitizeSubject('line1\r\nline2')).toBe('line1 line2')
    expect(sanitizeSubject('foo\rbar')).toBe('foo bar')
    expect(sanitizeSubject('a\n\n\nb')).toBe('a b')
  })

  test('leaves clean subjects untouched (trimmed)', () => {
    expect(sanitizeSubject('Speed exceeded (95 mph)')).toBe(
      'Speed exceeded (95 mph)',
    )
    expect(sanitizeSubject('  padded  ')).toBe('padded')
  })

  test('caps length at 200 to avoid pathological headers', () => {
    const long = 'x'.repeat(500)
    const cleaned = sanitizeSubject(long)
    expect(cleaned).toHaveLength(200)
  })
})
