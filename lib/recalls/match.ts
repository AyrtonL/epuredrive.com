/**
 * Turns the free-text make/model operators type into the vehicle names NHTSA's
 * recallsByVehicle endpoint understands. That endpoint only matches exact model
 * strings ("MODEL Y", not "Y"; "SILVERADO 1500", not "Silverado"), so we build
 * an ordered list of candidates and the checker uses the first that returns hits.
 */

export interface CarIdentity {
  make: string | null
  model: string | null
  year: number | null
}

export interface DecodedVin {
  make: string
  model: string
  year: number | null
  trim: string
}

export interface VehicleCandidate {
  make: string
  model: string
  year: number
}

const MAKE_ALIASES: Record<string, string> = {
  MERCEDES: 'MERCEDES-BENZ',
  'MERCEDES BENZ': 'MERCEDES-BENZ',
  'MERCEDES AMG': 'MERCEDES-BENZ',
  'MERCEDES-AMG': 'MERCEDES-BENZ',
  MB: 'MERCEDES-BENZ',
  VW: 'VOLKSWAGEN',
  CHEVY: 'CHEVROLET',
}

const MULTI_WORD_MAKES = new Set([
  'MERCEDES-BENZ', 'LAND ROVER', 'ALFA ROMEO', 'ASTON MARTIN', 'ROLLS ROYCE', 'ROLLS-ROYCE',
])

const HALF_TON_PICKUPS = new Set(['SILVERADO', 'SIERRA'])

function clean(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toUpperCase()
}

/** Canonical make, plus any model words the operator typed into the make field. */
export function normalizeMake(raw: string | null): { make: string; modelPrefix: string } {
  const value = clean(raw)
  if (MAKE_ALIASES[value]) return { make: MAKE_ALIASES[value], modelPrefix: '' }
  if (MULTI_WORD_MAKES.has(value) || !value.includes(' ')) return { make: value, modelPrefix: '' }

  const [first, ...rest] = value.split(' ')
  return { make: MAKE_ALIASES[first] ?? first, modelPrefix: rest.join(' ') }
}

/** "S580-4M" → "S580" — Mercedes/BMW trims carry the NHTSA model name. */
function trimToModel(trim: string): string {
  const match = clean(trim).match(/^[A-Z]*\d+[A-Z]*/)
  return match ? match[0] : ''
}

function modelVariants(model: string, make: string): string[] {
  const variants = [model]
  if (make === 'TESLA' && !model.startsWith('MODEL ')) variants.push(`MODEL ${model}`)
  if (HALF_TON_PICKUPS.has(model)) variants.push(`${model} 1500`)
  const firstWord = model.split(' ')[0]
  if (firstWord && firstWord !== model) variants.push(firstWord)
  return variants
}

export function buildCandidates(car: CarIdentity, decoded?: DecodedVin | null): VehicleCandidate[] {
  const year = decoded?.year ?? car.year
  if (!year) return []

  const { make, modelPrefix } = normalizeMake(car.make)
  const typedModel = clean([modelPrefix, car.model].filter(Boolean).join(' '))

  const pairs: Array<[string, string]> = []
  if (decoded?.make && decoded.model) {
    const decodedMake = normalizeMake(decoded.make).make
    const decodedModel = clean(decoded.model)
    pairs.push(...modelVariants(decodedModel, decodedMake).map((m): [string, string] => [decodedMake, m]))
    const fromTrim = trimToModel(decoded.trim)
    if (fromTrim) pairs.push([decodedMake, fromTrim])
  }
  if (make && typedModel) {
    pairs.push(...modelVariants(typedModel, make).map((m): [string, string] => [make, m]))
  }

  const seen = new Set<string>()
  return pairs
    .filter(([mk, md]) => mk && md)
    .filter(([mk, md]) => {
      const key = `${mk}|${md}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map(([mk, md]) => ({ make: mk, model: md, year }))
}

/** NHTSA returns ReportReceivedDate as DD/MM/YYYY. */
export function parseNhtsaDate(value: string | null | undefined): string | null {
  const match = (value ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null
}
