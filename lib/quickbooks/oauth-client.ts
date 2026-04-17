import OAuthClient from 'intuit-oauth'
import crypto from 'crypto'

function getRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  if (appUrl) return `${appUrl}/api/integrations/quickbooks/callback`
  return 'http://localhost:3000/api/integrations/quickbooks/callback'
}

export function createOAuthClient(): OAuthClient {
  const clientId = process.env.QB_CLIENT_ID
  const clientSecret = process.env.QB_CLIENT_SECRET
  const environment = (process.env.QB_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production'

  if (!clientId || !clientSecret) {
    throw new Error('Missing QB_CLIENT_ID or QB_CLIENT_SECRET environment variables')
  }

  return new OAuthClient({
    clientId,
    clientSecret,
    environment,
    redirectUri: getRedirectUri(),
  })
}

/**
 * Sign the OAuth state param so the callback can verify it wasn't forged.
 * Format: `tenantId.hmacHex`
 */
export function signState(tenantId: string): string {
  const secret = process.env.QB_CLIENT_SECRET
  if (!secret) throw new Error('QB_CLIENT_SECRET not configured')
  const sig = crypto.createHmac('sha256', secret).update(tenantId).digest('hex')
  return `${tenantId}.${sig}`
}

/**
 * Verify and extract tenantId from a signed state param.
 * Returns the tenantId or null if the signature is invalid.
 */
export function verifyState(state: string): string | null {
  const dotIdx = state.lastIndexOf('.')
  if (dotIdx === -1) return null
  const tenantId = state.slice(0, dotIdx)
  const sig = state.slice(dotIdx + 1)
  const secret = process.env.QB_CLIENT_SECRET
  if (!secret) return null
  const expected = crypto.createHmac('sha256', secret).update(tenantId).digest('hex')
  const expectedBuf = Buffer.from(expected, 'hex')
  const actualBuf = Buffer.from(sig, 'hex')
  if (expectedBuf.length !== actualBuf.length) return null
  if (!crypto.timingSafeEqual(expectedBuf, actualBuf)) return null
  return tenantId
}

export function getAuthorizationUrl(tenantId: string): string {
  const client = createOAuthClient()
  return client.authorizeUri({
    scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
    state: signState(tenantId),
  })
}
