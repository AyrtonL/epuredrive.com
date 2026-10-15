import type { SupabaseClient } from '@supabase/supabase-js'

// Every car listing in the dashboard shows the operator's own vehicles first
// and consignment vehicles after. Any row in `consignments` marks a car as
// consigned (same rule the fleet page and calendar timeline already used).

type Comparator<T> = (a: T, b: T) => number

/** Car ids that have a consignment row for this tenant. */
export async function fetchConsignedCarIds(supabase: SupabaseClient, tenantId: string): Promise<Set<number>> {
  const { data, error } = await supabase.from('consignments').select('car_id').eq('tenant_id', tenantId)
  if (error) console.error('[fleet] load consigned car ids:', error.message)
  return new Set((data ?? []).map((c) => c.car_id as number | null).filter((id): id is number => id != null))
}

/**
 * Returns a new array with owned cars first, consigned cars after. Inside each
 * group `then` decides the order (default: the incoming order, sort is stable).
 * `getId` lets callers sort derived rows (e.g. `{ car, utilization }`).
 */
export function sortOwnedFirst<T>(
  rows: readonly T[],
  consigned: ReadonlySet<number>,
  getId: (row: T) => number | null | undefined,
  then: Comparator<T> = () => 0,
): T[] {
  const rank = (row: T) => {
    const id = getId(row)
    return id != null && consigned.has(id) ? 1 : 0
  }
  return [...rows].sort((a, b) => rank(a) - rank(b) || then(a, b))
}

/** Shorthand for plain car rows with an `id`. */
export function sortCarsOwnedFirst<T extends { id: number }>(
  cars: readonly T[],
  consigned: ReadonlySet<number>,
  then?: Comparator<T>,
): T[] {
  return sortOwnedFirst(cars, consigned, (c) => c.id, then)
}
