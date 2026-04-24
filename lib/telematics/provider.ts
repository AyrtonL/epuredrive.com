// lib/telematics/provider.ts
// Provider-agnostic interface. BouncieProvider is the only implementation
// today; Smartcar/Samsara/Geotab adapters can be added later without touching
// the ingest layer or dashboard pages.

import type { OAuthTokens, ProviderVehicle, ProviderTrip, ProviderEvent } from './types'

export interface TelematicsProvider {
  readonly name: 'bouncie'

  // ── OAuth ──────────────────────────────────────────────────────────
  buildAuthorizationUrl(state: string, redirectUri: string): string
  exchangeCodeForToken(code: string, redirectUri: string): Promise<OAuthTokens>
  refreshAccessToken(refreshToken: string): Promise<OAuthTokens>
  revokeToken(accessToken: string): Promise<void>

  // ── Pull (backfill + listing) ──────────────────────────────────────
  listVehicles(accessToken: string): Promise<ProviderVehicle[]>
  listTrips(accessToken: string, imei: string, since: Date): Promise<ProviderTrip[]>

  // ── Webhook (push) ─────────────────────────────────────────────────
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean
  parseWebhookPayload(rawBody: string): ProviderEvent[]
}
