import crypto from 'crypto'

const SQUARE_BASE_URL = process.env.SQUARE_ENVIRONMENT === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com'

/**
 * Sign the OAuth state param so the callback can verify it wasn't forged.
 * Format: `tenantId.hmacHex`
 */
function signState(tenantId: string): string {
  const secret = process.env.SQUARE_APPLICATION_SECRET
  if (!secret) throw new Error('SQUARE_APPLICATION_SECRET not configured')
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
  const secret = process.env.SQUARE_APPLICATION_SECRET
  if (!secret) return null
  const expected = crypto.createHmac('sha256', secret).update(tenantId).digest('hex')
  const expectedBuf = Buffer.from(expected, 'hex')
  const actualBuf = Buffer.from(sig, 'hex')
  if (expectedBuf.length !== actualBuf.length) return null
  if (!crypto.timingSafeEqual(expectedBuf, actualBuf)) return null
  return tenantId
}

/**
 * Generate Square OAuth authorization URL.
 * State param is HMAC-signed to prevent forgery.
 */
export function getSquareAuthorizationUrl(tenantId: string): string {
  const clientId = process.env.SQUARE_APPLICATION_ID
  if (!clientId) throw new Error('SQUARE_APPLICATION_ID not configured')

  const redirectUri = process.env.SQUARE_REDIRECT_URI
  if (!redirectUri) throw new Error('SQUARE_REDIRECT_URI not configured')

  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'PAYMENTS_WRITE PAYMENTS_READ ORDERS_WRITE ORDERS_READ MERCHANT_PROFILE_READ',
    session: 'false',
    state: signState(tenantId),
    redirect_uri: redirectUri,
  })

  return `${SQUARE_BASE_URL}/oauth2/authorize?${params.toString()}`
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_at: string      // ISO timestamp
  merchant_id: string
}

/**
 * Exchange authorization code for access + refresh tokens.
 */
export async function exchangeSquareCode(code: string): Promise<TokenResponse> {
  const res = await fetch(`${SQUARE_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Square-Version': '2025-01-23',
    },
    body: JSON.stringify({
      client_id: process.env.SQUARE_APPLICATION_ID,
      client_secret: process.env.SQUARE_APPLICATION_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.SQUARE_REDIRECT_URI,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Square token exchange failed: ${res.status} ${text}`)
  }

  const data = await res.json()
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    merchant_id: data.merchant_id,
  }
}

/**
 * Refresh an expired access token.
 */
export async function refreshSquareToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(`${SQUARE_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Square-Version': '2025-01-23',
    },
    body: JSON.stringify({
      client_id: process.env.SQUARE_APPLICATION_ID,
      client_secret: process.env.SQUARE_APPLICATION_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Square token refresh failed: ${res.status} ${text}`)
  }

  const data = await res.json()
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    merchant_id: data.merchant_id,
  }
}
