import { findRecallsForCar, toRecallRow } from '@/lib/recalls/check'
import type { NhtsaRecall } from '@/lib/recalls/nhtsa'
import type { VehicleCandidate } from '@/lib/recalls/match'

const recall = (n: string, extra: Partial<NhtsaRecall> = {}): NhtsaRecall => ({
  NHTSACampaignNumber: n,
  Component: 'SEATS',
  Summary: 'summary',
  ReportReceivedDate: '01/02/2024',
  ...extra,
})

function fakeFetcher(hits: Record<string, NhtsaRecall[]>) {
  const calls: string[] = []
  const fetchRecalls = async (v: VehicleCandidate) => {
    const key = `${v.make}|${v.model}|${v.year}`
    calls.push(key)
    return hits[key] ?? []
  }
  return { fetchRecalls, calls }
}

describe('findRecallsForCar', () => {
  it('stops at the first candidate that returns recalls', async () => {
    const { fetchRecalls, calls } = fakeFetcher({ 'TESLA|MODEL Y|2026': [recall('25V359000')] })
    const result = await findRecallsForCar(
      { make: 'Tesla', model: 'Y', year: 2026, vin: null },
      { fetchRecalls, decodeVin: async () => null, cache: new Map() },
    )
    expect(result?.match.model).toBe('MODEL Y')
    expect(result?.recalls).toHaveLength(1)
    expect(calls).toEqual(['TESLA|Y|2026', 'TESLA|MODEL Y|2026'])
  })

  it('returns null when no candidate has recalls', async () => {
    const { fetchRecalls } = fakeFetcher({})
    const result = await findRecallsForCar(
      { make: 'BMW', model: 'X3', year: 2012, vin: null },
      { fetchRecalls, decodeVin: async () => null, cache: new Map() },
    )
    expect(result).toBeNull()
  })

  it('reuses cached lookups across cars of the same vehicle', async () => {
    const { fetchRecalls, calls } = fakeFetcher({ 'AUDI|Q3|2018': [recall('19V385000')] })
    const deps = { fetchRecalls, decodeVin: async () => null, cache: new Map() }
    await findRecallsForCar({ make: 'Audi', model: 'Q3', year: 2018, vin: null }, deps)
    await findRecallsForCar({ make: 'AUDI', model: 'Q3', year: 2018, vin: null }, deps)
    expect(calls).toEqual(['AUDI|Q3|2018'])
  })

  it('still matches on typed values when VIN decoding fails', async () => {
    const { fetchRecalls } = fakeFetcher({ 'AUDI|Q3|2018': [recall('19V385000')] })
    const result = await findRecallsForCar(
      { make: 'Audi', model: 'Q3', year: 2018, vin: 'WA1BCCFS6JR034820' },
      {
        fetchRecalls,
        decodeVin: async () => { throw new Error('vPIC down') },
        cache: new Map(),
      },
    )
    expect(result?.recalls).toHaveLength(1)
  })
})

describe('toRecallRow', () => {
  it('maps NHTSA fields and flags onto a car_recalls row', () => {
    const row = toRecallRow(
      { id: 3, tenant_id: 't1' },
      { make: 'PORSCHE', model: 'CAYENNE', year: 2021 },
      recall('22V040000', { parkIt: true, Remedy: 'Dealers will inspect' }),
    )
    expect(row).toMatchObject({
      tenant_id: 't1',
      car_id: 3,
      campaign_number: '22V040000',
      report_received_date: '2024-02-01',
      park_it: true,
      park_outside: false,
      remedy: 'Dealers will inspect',
      matched_make: 'PORSCHE',
      matched_model: 'CAYENNE',
      matched_year: 2021,
    })
  })
})
