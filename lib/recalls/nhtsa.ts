/**
 * Thin client for NHTSA's free, keyless public APIs:
 *   - api.nhtsa.gov/recalls/recallsByVehicle  (recall campaigns by make/model/year)
 *   - vpic.nhtsa.dot.gov DecodeVinValues      (VIN → canonical make/model/year/trim)
 * US-market vehicles only; anything else simply returns no results.
 */
import type { DecodedVin, VehicleCandidate } from './match'

const RECALLS_URL = 'https://api.nhtsa.gov/recalls/recallsByVehicle'
const VPIC_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues'
const REQUEST_TIMEOUT_MS = 10_000
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/

export interface NhtsaRecall {
  NHTSACampaignNumber: string
  Manufacturer?: string
  Component?: string
  Summary?: string
  Consequence?: string
  Remedy?: string
  ReportReceivedDate?: string
  parkIt?: boolean
  parkOutSide?: boolean
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  // recallsByVehicle answers 400 for a make/model it doesn't know — that's "no recalls", not an outage.
  if (res.status === 400) return { results: [] }
  if (!res.ok) throw new Error(`NHTSA ${res.status} for ${url}`)
  return res.json()
}

export async function fetchRecalls(vehicle: VehicleCandidate): Promise<NhtsaRecall[]> {
  const params = new URLSearchParams({
    make: vehicle.make,
    model: vehicle.model,
    modelYear: String(vehicle.year),
  })
  const body = (await getJson(`${RECALLS_URL}?${params}`)) as { results?: unknown }
  if (!Array.isArray(body.results)) return []
  return body.results.filter(
    (r): r is NhtsaRecall => typeof (r as NhtsaRecall)?.NHTSACampaignNumber === 'string',
  )
}

export async function decodeVin(vin: string | null): Promise<DecodedVin | null> {
  const clean = (vin ?? '').trim().toUpperCase()
  if (!VIN_PATTERN.test(clean)) return null

  const body = (await getJson(`${VPIC_URL}/${clean}?format=json`)) as {
    Results?: Array<{ Make?: string; Model?: string; ModelYear?: string; Trim?: string }>
  }
  const r = body.Results?.[0]
  if (!r?.Make || !r.Model) return null
  const year = Number(r.ModelYear)
  return {
    make: r.Make,
    model: r.Model,
    year: Number.isInteger(year) && year > 1900 ? year : null,
    trim: r.Trim ?? '',
  }
}
