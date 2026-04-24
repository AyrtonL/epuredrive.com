// lib/telematics/config.ts
// Env var loader for the Bouncie telematics integration.
// Getters throw on first access if a required var is missing — this keeps
// module-level imports cheap and lets server-only callers fail fast in prod
// while allowing tests to run without every var set.

function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

export const bouncieConfig = {
  get clientId() { return required('BOUNCIE_CLIENT_ID') },
  get clientSecret() { return required('BOUNCIE_CLIENT_SECRET') },
  get webhookSecret() { return required('BOUNCIE_WEBHOOK_SECRET') },
  get redirectUri() { return required('BOUNCIE_REDIRECT_URI') },
  // Hardcoded (not env-configurable) to close SSRF surface — audit finding #7.
  authorizeUrl: 'https://auth.bouncie.com/dialog/authorize',
  tokenUrl: 'https://auth.bouncie.com/oauth/token',
  apiBaseUrl: 'https://api.bouncie.dev/v1',
} as const
