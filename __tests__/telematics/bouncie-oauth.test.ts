/**
 * @jest-environment node
 */
import { BouncieProvider } from '@/lib/telematics/bouncie'

describe('BouncieProvider OAuth', () => {
  const provider = new BouncieProvider()

  beforeEach(() => {
    process.env.BOUNCIE_CLIENT_ID = 'cid'
    process.env.BOUNCIE_CLIENT_SECRET = 'csec'
    jest.restoreAllMocks()
  })

  test('buildAuthorizationUrl includes required params', () => {
    const url = provider.buildAuthorizationUrl('state-nonce', 'https://app/cb')
    expect(url).toContain('client_id=cid')
    expect(url).toContain('state=state-nonce')
    expect(url).toContain(encodeURIComponent('https://app/cb'))
    expect(url).toContain('response_type=code')
  })

  test('exchangeCodeForToken maps response and computes ISO expires_at', async () => {
    const spy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        access_token: 'a', refresh_token: 'r',
        expires_in: 3600, token_type: 'Bearer', scope: 'basic',
      }), { status: 200, headers: { 'content-type': 'application/json' } }),
    )
    const tokens = await provider.exchangeCodeForToken('xyz', 'https://app/cb')
    expect(tokens.access_token).toBe('a')
    expect(tokens.refresh_token).toBe('r')
    expect(tokens.scope).toBe('basic')
    const expMs = new Date(tokens.expires_at).getTime()
    expect(expMs).toBeGreaterThan(Date.now() + 3500_000)
    expect(expMs).toBeLessThan(Date.now() + 3700_000)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  test('refreshAccessToken posts refresh_token grant', async () => {
    let capturedBody = ''
    jest.spyOn(global, 'fetch').mockImplementation(async (_url, init) => {
      capturedBody = String(init?.body ?? '')
      return new Response(JSON.stringify({
        access_token: 'a2', refresh_token: 'r2',
        expires_in: 3600, token_type: 'Bearer',
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    })
    const t = await provider.refreshAccessToken('old-refresh')
    expect(capturedBody).toContain('grant_type=refresh_token')
    expect(capturedBody).toContain('refresh_token=old-refresh')
    expect(capturedBody).toContain('client_id=cid')
    expect(t.access_token).toBe('a2')
    expect(t.refresh_token).toBe('r2')
  })

  test('revokeToken does not throw on network failure', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('boom'))
    await expect(provider.revokeToken('any')).resolves.toBeUndefined()
  })
})
