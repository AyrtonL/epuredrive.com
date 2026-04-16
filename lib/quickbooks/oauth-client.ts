import OAuthClient from 'intuit-oauth'

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

export function getAuthorizationUrl(tenantId: string): string {
  const client = createOAuthClient()
  return client.authorizeUri({
    scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
    state: tenantId,
  })
}
