// lib/telematics/bouncie/index.ts
// Bouncie implementation of TelematicsProvider.
// Public-facing API talks in neutral DTOs (ProviderVehicle/Trip/Event);
// Bouncie-specific types stay inside this directory.

import type { TelematicsProvider } from '../provider'
import type { OAuthTokens, ProviderVehicle, ProviderTrip, ProviderEvent } from '../types'
import { bouncieConfig } from '../config'
import { bouncieApi } from './api'
import type { BouncieTokenResponse, BouncieVehicle, BouncieTrip } from './types'

export class BouncieProvider implements TelematicsProvider {
  readonly name = 'bouncie' as const

  // ── OAuth ─────────────────────────────────────────────────────────

  buildAuthorizationUrl(state: string, redirectUri: string): string {
    const u = new URL(bouncieConfig.authorizeUrl)
    u.searchParams.set('client_id', bouncieConfig.clientId)
    u.searchParams.set('redirect_uri', redirectUri)
    u.searchParams.set('response_type', 'code')
    u.searchParams.set('state', state)
    return u.toString()
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<OAuthTokens> {
    const form = new URLSearchParams({
      client_id: bouncieConfig.clientId,
      client_secret: bouncieConfig.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    })
    const r = await bouncieApi.postForm<BouncieTokenResponse>(bouncieConfig.tokenUrl, form)
    return this.mapTokenResponse(r)
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const form = new URLSearchParams({
      client_id: bouncieConfig.clientId,
      client_secret: bouncieConfig.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })
    const r = await bouncieApi.postForm<BouncieTokenResponse>(bouncieConfig.tokenUrl, form)
    return this.mapTokenResponse(r)
  }

  async revokeToken(accessToken: string): Promise<void> {
    // Bouncie has no documented revoke endpoint. Best-effort call to /logout;
    // failure is ignored — caller marks the connection disconnected regardless.
    try {
      await fetch(`${bouncieConfig.apiBaseUrl}/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    } catch {
      // ignore
    }
  }

  private mapTokenResponse(r: BouncieTokenResponse): OAuthTokens {
    return {
      access_token: r.access_token,
      refresh_token: r.refresh_token,
      expires_at: new Date(Date.now() + r.expires_in * 1000).toISOString(),
      scope: r.scope ?? null,
      // Bouncie doesn't return email in the token response; populated later
      // by listVehicles() or left null (not blocking for MVP).
      account_email: null,
    }
  }

  // ── Pull ──────────────────────────────────────────────────────────

  async listVehicles(accessToken: string): Promise<ProviderVehicle[]> {
    const raw = await bouncieApi.get<BouncieVehicle[]>('/vehicles', accessToken)
    const SIX_HOURS_MS = 6 * 3600 * 1000
    return raw.map(v => ({
      imei: v.imei,
      vin: v.vin ?? null,
      nickname: v.nickName ?? null,
      online: Boolean(
        v.stats?.lastUpdated &&
        Date.now() - new Date(v.stats.lastUpdated).getTime() < SIX_HOURS_MS,
      ),
      last_seen_at: v.stats?.lastUpdated ?? null,
      last_lat: v.stats?.location?.lat ?? null,
      last_lon: v.stats?.location?.lon ?? null,
      odometer_mi: v.stats?.odometer ?? null,
      battery_voltage: null,
    }))
  }

  async listTrips(accessToken: string, imei: string, since: Date): Promise<ProviderTrip[]> {
    const qs = `?imei=${encodeURIComponent(imei)}&starts-after=${encodeURIComponent(since.toISOString())}`
    const raw = await bouncieApi.get<BouncieTrip[]>(`/trips${qs}`, accessToken)
    return raw.map(t => ({
      provider_trip_id: t.transactionId,
      imei: t.imei,
      started_at: t.startTime,
      ended_at: t.endTime ?? null,
      start_lat: t.gpsTrail?.[0]?.lat ?? null,
      start_lon: t.gpsTrail?.[0]?.lon ?? null,
      end_lat: t.gpsTrail?.at(-1)?.lat ?? null,
      end_lon: t.gpsTrail?.at(-1)?.lon ?? null,
      distance_mi: t.distance ?? 0,
      duration_s: t.duration ?? null,
      max_speed_mph: t.maxSpeed ?? null,
      hard_braking_count: t.hardBrakingCount ?? 0,
      hard_accel_count: t.hardAccelerationCount ?? 0,
      fuel_consumed_gal: t.fuelConsumed ?? null,
    }))
  }

  // ── Webhook (Tasks 8 + 9) ─────────────────────────────────────────

  verifyWebhookSignature(_rawBody: string, _signatureHeader: string | null): boolean {
    throw new Error('not implemented yet (Task 8)')
  }

  parseWebhookPayload(_rawBody: string): ProviderEvent[] {
    throw new Error('not implemented yet (Task 9)')
  }
}
