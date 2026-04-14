const FUEL_LEVELS: Record<string, number> = {
  Full: 4,
  '3/4': 3,
  '1/2': 2,
  '1/4': 1,
  Empty: 0,
}

export function getFuelLevel(fuel: string): number {
  return FUEL_LEVELS[fuel] ?? -1
}

export function getFuelDiscrepancy(
  fuelOut: string | null,
  fuelIn: string | null,
  chargePerLevel: number
): { levelsMissing: number; suggestedCharge: number } {
  if (!fuelOut || !fuelIn) return { levelsMissing: 0, suggestedCharge: 0 }
  const levelsMissing = Math.max(0, getFuelLevel(fuelOut) - getFuelLevel(fuelIn))
  return { levelsMissing, suggestedCharge: levelsMissing * chargePerLevel }
}
