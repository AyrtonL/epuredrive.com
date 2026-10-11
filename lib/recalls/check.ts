/**
 * Daily recall sweep: for every car with a year (or decodable VIN), look up
 * NHTSA recall campaigns and record any campaign not already stored for that car.
 * Rows land with notified_at = null; lib/recalls/notify.ts sends the alerts.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildCandidates, parseNhtsaDate, type DecodedVin, type VehicleCandidate } from './match'
import { decodeVin, fetchRecalls, type NhtsaRecall } from './nhtsa'

const CONCURRENCY = 4

export interface RecallCar {
  make: string | null
  model: string | null
  year: number | null
  vin: string | null
}

export interface RecallDeps {
  fetchRecalls: (v: VehicleCandidate) => Promise<NhtsaRecall[]>
  decodeVin: (vin: string | null) => Promise<DecodedVin | null>
  /** Shared across one sweep so fleets with many identical cars hit NHTSA once. */
  cache: Map<string, Promise<NhtsaRecall[]>>
}

export interface RecallMatch {
  match: VehicleCandidate
  recalls: NhtsaRecall[]
}

export async function findRecallsForCar(car: RecallCar, deps: RecallDeps): Promise<RecallMatch | null> {
  const decoded = await deps.decodeVin(car.vin).catch((err: unknown) => {
    console.error('[recalls] VIN decode failed:', err instanceof Error ? err.message : err)
    return null
  })

  for (const candidate of buildCandidates(car, decoded)) {
    const key = `${candidate.make}|${candidate.model}|${candidate.year}`
    if (!deps.cache.has(key)) deps.cache.set(key, deps.fetchRecalls(candidate))
    const recalls = await deps.cache.get(key)!
    if (recalls.length > 0) return { match: candidate, recalls }
  }
  return null
}

export function toRecallRow(
  car: { id: number; tenant_id: string },
  match: VehicleCandidate,
  r: NhtsaRecall,
) {
  return {
    tenant_id: car.tenant_id,
    car_id: car.id,
    campaign_number: r.NHTSACampaignNumber,
    manufacturer: r.Manufacturer ?? null,
    component: r.Component ?? null,
    summary: r.Summary ?? null,
    consequence: r.Consequence ?? null,
    remedy: r.Remedy ?? null,
    report_received_date: parseNhtsaDate(r.ReportReceivedDate),
    park_it: r.parkIt === true,
    park_outside: r.parkOutSide === true,
    matched_make: match.make,
    matched_model: match.model,
    matched_year: match.year,
  }
}

interface CarRow extends RecallCar {
  id: number
  tenant_id: string | null
}

export interface SweepResult {
  carsChecked: number
  carsWithRecalls: number
  inserted: number
  errors: number
}

export async function sweepRecalls(supabase: SupabaseClient): Promise<SweepResult> {
  const { data: cars, error } = await supabase
    .from('cars')
    .select('id, tenant_id, make, model, year, vin')
    .not('tenant_id', 'is', null)
    .or('status.is.null,status.neq.retired')
  if (error) throw new Error(`load cars: ${error.message}`)

  const deps: RecallDeps = { fetchRecalls, decodeVin, cache: new Map() }
  const result: SweepResult = { carsChecked: 0, carsWithRecalls: 0, inserted: 0, errors: 0 }
  const queue = [...((cars ?? []) as CarRow[])]

  async function worker() {
    for (let car = queue.shift(); car; car = queue.shift()) {
      result.carsChecked += 1
      try {
        const inserted = await checkOneCar(supabase, car, deps, result)
        result.inserted += inserted
      } catch (err) {
        result.errors += 1
        console.error(`[recalls] car ${car.id} failed:`, err instanceof Error ? err.message : err)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  return result
}

async function checkOneCar(
  supabase: SupabaseClient,
  car: CarRow,
  deps: RecallDeps,
  result: SweepResult,
): Promise<number> {
  const found = await findRecallsForCar(car, deps)
  if (!found) return 0
  result.carsWithRecalls += 1

  const rows = found.recalls.map((r) => toRecallRow({ id: car.id, tenant_id: car.tenant_id! }, found.match, r))
  const { data, error } = await supabase
    .from('car_recalls')
    .upsert(rows, { onConflict: 'car_id,campaign_number', ignoreDuplicates: true })
    .select('id')
  if (error) throw new Error(`upsert: ${error.message}`)
  return data?.length ?? 0
}
