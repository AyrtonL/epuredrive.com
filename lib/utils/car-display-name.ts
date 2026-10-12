// lib/utils/car-display-name.ts
//
// One way to name a car everywhere. Operators often type the make into
// model_full too ("Tesla Y"), so naive `${make} ${model_full}` rendered
// "Tesla Tesla Y". Imported VIN-decoded makes arrive in ALL CAPS ("AUDI")
// while hand-entered ones don't, so make casing is normalized as well.

export interface CarNameFields {
  make?: string | null
  model?: string | null
  model_full?: string | null
}

const ACRONYM_MAX_LENGTH = 3

function normalizeMakeWord(word: string): string {
  const isAllCaps = word === word.toUpperCase() && /[A-Z]/.test(word)
  if (!isAllCaps || word.length <= ACRONYM_MAX_LENGTH) return word
  return word.charAt(0) + word.slice(1).toLowerCase()
}

function normalizeMake(make: string): string {
  return make.split(/\s+/).filter(Boolean).map(normalizeMakeWord).join(' ')
}

function startsWithWord(text: string, prefix: string): boolean {
  const t = text.toLowerCase()
  const p = prefix.toLowerCase()
  return t === p || t.startsWith(`${p} `)
}

export function carDisplayName(car: CarNameFields): string {
  const make = normalizeMake((car.make ?? '').trim())
  const model = (car.model_full?.trim() || car.model?.trim()) ?? ''

  if (!make) return model || 'Vehicle'
  if (!model) return make
  if (startsWithWord(model, make)) return `${make}${model.slice(make.length)}`
  return `${make} ${model}`
}
