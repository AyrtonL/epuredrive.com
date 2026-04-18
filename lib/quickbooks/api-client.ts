import { createAdminClient } from '@/lib/supabase/admin'
import { decryptToken, encryptToken } from '@/lib/quickbooks/token-crypto'

interface QBConnection {
  realm_id: string
  access_token: string
  refresh_token: string
  access_token_expires_at: string
  refresh_token_expires_at: string
}

function getBaseUrl(): string {
  return process.env.QB_ENVIRONMENT === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com'
}

/**
 * Refresh the access token if it's expired or about to expire (within 5 minutes).
 * Returns the current (or refreshed) connection.
 */
async function ensureFreshToken(tenantId: string): Promise<QBConnection> {
  const supabase = createAdminClient()

  const { data: conn, error } = await supabase
    .from('qb_connections')
    .select('realm_id, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at')
    .eq('tenant_id', tenantId)
    .single()

  if (error || !conn) {
    throw new Error('QuickBooks not connected for this tenant')
  }

  // Decrypt tokens from storage
  const decryptedAccessToken = decryptToken(conn.access_token)
  const decryptedRefreshToken = decryptToken(conn.refresh_token)

  const expiresAt = new Date(conn.access_token_expires_at)
  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000)

  // Token is still fresh
  if (expiresAt > fiveMinFromNow) {
    return {
      ...conn,
      access_token: decryptedAccessToken,
      refresh_token: decryptedRefreshToken,
    } as QBConnection
  }

  // Check if refresh token itself is expired
  const refreshExpiresAt = new Date(conn.refresh_token_expires_at)
  if (refreshExpiresAt < new Date()) {
    // Disable the connection — user must reconnect
    await supabase
      .from('qb_connections')
      .update({ sync_enabled: false })
      .eq('tenant_id', tenantId)
    throw new Error('QuickBooks refresh token expired. Please reconnect your account.')
  }

  // Refresh the token using decrypted refresh token
  const { createOAuthClient } = await import('./oauth-client')
  const oauthClient = createOAuthClient()
  oauthClient.setToken({ refresh_token: decryptedRefreshToken })

  const authResponse = await oauthClient.refresh()
  const newTokens = authResponse.getJson()

  const now = new Date()
  const newAccessExpires = new Date(now.getTime() + (newTokens.expires_in || 3600) * 1000)
  const newRefreshExpires = new Date(now.getTime() + (newTokens.x_refresh_token_expires_in || 8726400) * 1000)

  // Encrypt new tokens before storing
  await supabase
    .from('qb_connections')
    .update({
      access_token: encryptToken(newTokens.access_token),
      refresh_token: encryptToken(newTokens.refresh_token),
      access_token_expires_at: newAccessExpires.toISOString(),
      refresh_token_expires_at: newRefreshExpires.toISOString(),
    })
    .eq('tenant_id', tenantId)

  return {
    ...conn,
    access_token: newTokens.access_token,
    refresh_token: newTokens.refresh_token,
    access_token_expires_at: newAccessExpires.toISOString(),
    refresh_token_expires_at: newRefreshExpires.toISOString(),
  } as QBConnection
}

/**
 * Log a QBO API call to the qb_api_logs table for troubleshooting.
 * Only logs errors (non-2xx) to keep volume manageable.
 */
async function logQboCall(
  tenantId: string,
  method: string,
  path: string,
  statusCode: number,
  intuitTid: string | null,
  errorBody: string | null
): Promise<void> {
  try {
    const supabase = createAdminClient()
    await supabase.from('qb_api_logs').insert({
      tenant_id: tenantId,
      intuit_tid: intuitTid,
      method,
      path,
      status_code: statusCode,
      error_body: errorBody,
    })
  } catch (err) {
    console.error('[qbo-log] Failed to write API log:', err)
  }
}

/**
 * Make an authenticated request to the QuickBooks API.
 * Automatically refreshes tokens if needed.
 * Captures intuit_tid from response headers for Intuit support troubleshooting.
 */
export async function qboRequest<T = unknown>(
  tenantId: string,
  method: 'GET' | 'POST',
  path: string,
  body?: object
): Promise<T> {
  const conn = await ensureFreshToken(tenantId)
  const base = getBaseUrl()
  const url = `${base}/v3/company/${conn.realm_id}/${path}`

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${conn.access_token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const intuitTid = res.headers.get('intuit_tid')

  if (!res.ok) {
    const errBody = await res.text()
    console.error(`[qbo] ${method} ${path} failed (${res.status}) intuit_tid=${intuitTid}:`, errBody)
    await logQboCall(tenantId, method, path, res.status, intuitTid, errBody)
    throw new Error(`QBO API ${method} ${path} failed (${res.status}): ${errBody}`)
  }

  return res.json() as Promise<T>
}

/**
 * Query QBO entities with a SQL-like query string.
 */
export async function qboQuery<T = unknown>(
  tenantId: string,
  query: string
): Promise<T> {
  return qboRequest<T>(tenantId, 'GET', `query?query=${encodeURIComponent(query)}`)
}
