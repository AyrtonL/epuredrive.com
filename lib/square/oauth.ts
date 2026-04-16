const SQUARE_BASE_URL = process.env.SQUARE_ENVIRONMENT === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com'

/**
 * Generate Square OAuth authorization URL.
 * State param contains the tenantId for the callback.
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
    state: tenantId,
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
