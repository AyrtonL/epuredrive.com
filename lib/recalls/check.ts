/**
 * Daily recall sweep: for every owned car with a year (or decodable VIN), look up
 * NHTSA recall campaigns and record any campaign not already stored for that car.
 * Rows land with notified_at = null; lib/recalls/notify.ts sends the alerts.
 *
 * Only NEW campaigns alert. NHTSA has no keyless per-VIN API (the nhtsa.gov VIN
 * search is reCAPTCHA-gated), so a model's recall backlog is mostly units that
 * were repaired long ago. The first check of a car — or of a car whose
 * make/model/year/VIN changed (cars.recall_baseline_key) — stores the backlog
 * as silent status='baseline' rows; anything published afterwards alerts.
 * Cars under an active consignment contract are skipped — recalls on those are
 * the owner's responsibility, not the operator's.
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
  { baseline }: { baseline: boolean },
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
    status: baseline ? 'baseline' : 'open',
    notified_at: baseline ? new Date().toISOString() : null,
  }
}

/** Identity the baseline was taken for; a change means "start a fresh baseline". */
export function recallBaselineKey(car: RecallCar): string {
  const norm = (v: string | number | null) => String(v ?? '').trim().replace(/\s+/g, ' ').toUpperCase()
  return [car.make, car.model, car.year, car.vin].map(norm).join('|')
}

export interface ConsignmentContract {
  car_id: number | null
  contract_start: string | null
  contract_end: string | null
}

/** Car ids under a contract running today (both dates inclusive; null = open-ended). */
export function consignedCarIds(contracts: ConsignmentContract[], today: string): Set<number> {
  return new Set(
    contracts
      .filter((c) => (!c.contract_start || c.contract_start <= today) && (!c.contract_end || c.contract_end >= today))
      .flatMap((c) => (c.car_id == null ? [] : [c.car_id])),
  )
}

interface CarRow extends RecallCar {
  id: number
  tenant_id: string | null
  recall_baseline_key: string | null
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
    .select('id, tenant_id, make, model, year, vin, recall_baseline_key')
    .not('tenant_id', 'is', null)
    .or('status.is.null,status.neq.retired')
  if (error) throw new Error(`load cars: ${error.message}`)

  const { data: contracts, error: consignErr } = await supabase
    .from('consignments')
    .select('car_id, contract_start, contract_end')
  if (consignErr) throw new Error(`load consignments: ${consignErr.message}`)
  const consigned = consignedCarIds(contracts ?? [], new Date().toISOString().slice(0, 10))

  const deps: RecallDeps = { fetchRecalls, decodeVin, cache: new Map() }
  const result: SweepResult = { carsChecked: 0, carsWithRecalls: 0, inserted: 0, errors: 0 }
  const allCars = (cars ?? []) as CarRow[]
  const queue = allCars.filter((c) => !consigned.has(c.id))

  // A consigned car gets a fresh baseline when it comes back to the operator.
  const staleConsigned = allCars.filter((c) => consigned.has(c.id) && c.recall_baseline_key).map((c) => c.id)
  if (staleConsigned.length > 0) {
    const { error: resetErr } = await supabase.from('cars').update({ recall_baseline_key: null }).in('id', staleConsigned)
    if (resetErr) console.error('[recalls] reset consigned baselines:', resetErr.message)
  }

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
  const key = recallBaselineKey(car)
  const baseline = car.recall_baseline_key !== key
  const found = await findRecallsForCar(car, deps)

  let inserted = 0
  if (found) {
    result.carsWithRecalls += 1
    const rows = found.recalls.map((r) => toRecallRow({ id: car.id, tenant_id: car.tenant_id! }, found.match, r, { baseline }))
    const { data, error } = await supabase
      .from('car_recalls')
      .upsert(rows, { onConflict: 'car_id,campaign_number', ignoreDuplicates: true })
      .select('id')
    if (error) throw new Error(`upsert: ${error.message}`)
    inserted = data?.length ?? 0
  }

  // Record the baseline only after the lookup succeeded, so a failed NHTSA
  // call retries the baseline next run instead of alerting on the backlog.
  if (baseline) {
    const { error } = await supabase.from('cars').update({ recall_baseline_key: key }).eq('id', car.id)
    if (error) throw new Error(`set baseline: ${error.message}`)
  }
  return inserted
}
