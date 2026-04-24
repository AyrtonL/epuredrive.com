// app/(dashboard)/dashboard/telematics/geofences/page.tsx
// Geofences — §6.5 of the telematics design spec.
// Loads server-side:
//   - All tenant geofences
//   - Tenant cars (id, make, model, plate) as picker options
// Hands data to <GeofencesClient /> which renders the list + Leaflet editor +
// save/delete form. The page-level feature-flag gate is enforced by the
// parent dashboard layout; actions re-check as defense-in-depth.
import Link from 'next/link'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import GeofencesClient from '@/components/telematics/GeofencesClient'
import type { TelematicsGeofence } from '@/lib/supabase/types'

interface CarRow {
  id: number
  make: string | null
  model: string | null
  plate: string | null
}

function carLabel(c: CarRow): string {
  const name = [c.make, c.model].filter(Boolean).join(' ') || `Car ${c.id}`
  return c.plate ? `${name} (${c.plate})` : name
}

export const dynamic = 'force-dynamic'

export default async function TelematicsGeofencesPage() {
  const { supabase, tenantId } = await requireTenantId()

  const [{ data: geofences }, { data: cars }] = await Promise.all([
    supabase
      .from('telematics_geofences')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false }),
    supabase
      .from('cars')
      .select('id, make, model, plate')
      .eq('tenant_id', tenantId)
      .order('id'),
  ])

  const geofenceRows = (geofences as TelematicsGeofence[] | null) ?? []
  const carRows = (cars as CarRow[] | null) ?? []
  const carOptions = carRows.map((c) => ({ id: c.id, label: carLabel(c) }))

  const subtitle =
    geofenceRows.length === 0
      ? 'Draw allowed or forbidden zones for your fleet'
      : `${geofenceRows.length} geofence${geofenceRows.length === 1 ? '' : 's'} configured`

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Geofences"
        description={subtitle}
        action={
          <Link
            href="/dashboard/telematics/alerts"
            className="bg-white/[0.04] border border-white/10 text-white/70 hover:bg-white/[0.08] hover:text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-colors"
          >
            View alerts
          </Link>
        }
      />
      <GeofencesClient initialGeofences={geofenceRows} cars={carOptions} />
    </div>
  )
}
