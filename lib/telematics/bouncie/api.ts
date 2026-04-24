// lib/telematics/bouncie/api.ts
// Thin fetch wrapper with retry on 429 / 5xx. Only the adapter uses this.

import { bouncieConfig } from '../config'

export class BouncieApiError extends Error {
  constructor(public status: number, public body: string, msg?: string) {
    // Never surface the full body (may contain tokens) — keep message short.
    super(msg ?? `Bouncie API ${status}`)
  }
}

async function bouncieFetch<T>(
  url: string,
  init: RequestInit,
  retries = 2
): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init)
      if (res.status === 429 || res.status >= 500) {
        const body = await res.text()
        if (attempt === retries) throw new BouncieApiError(res.status, body)
        await new Promise(r => setTimeout(r, 2 ** attempt * 500))
        continue
      }
      if (!res.ok) {
        const body = await res.text()
        throw new BouncieApiError(res.status, body)
      }
      return (await res.json()) as T
    } catch (e: unknown) {
      lastErr = e
      if (e instanceof BouncieApiError && e.status < 500 && e.status !== 429) throw e
      if (attempt === retries) throw e
    }
  }
  throw lastErr ?? new Error('Bouncie fetch failed')
}

export const bouncieApi = {
  /** POST form-encoded to an absolute URL (token endpoint). */
  postForm: <T>(url: string, form: URLSearchParams) =>
    bouncieFetch<T>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    }, 1),

  /** GET with Bearer token against the API base URL. */
  get: <T>(path: string, accessToken: string) => {
    const url = path.startsWith('http') ? path : `${bouncieConfig.apiBaseUrl}${path}`
    return bouncieFetch<T>(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    })
  },
}
