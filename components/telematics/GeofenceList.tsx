'use client'

// components/telematics/GeofenceList.tsx
// Left-panel list of geofences on the Geofences page. A click selects a row
// for editing in the right-hand <GeofenceEditor />. The "active" toggle fires
// a server action directly; the "Delete" button prompts before hard-deleting.
import { useTransition } from 'react'
import {
  toggleGeofenceActiveAction,
  deleteGeofenceAction,
} from '@/app/(dashboard)/dashboard/telematics/geofences/actions'
import type { TelematicsGeofence } from '@/lib/supabase/types'

interface Props {
  geofences: TelematicsGeofence[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onNew: () => void
}

function kindBadge(kind: 'allowed' | 'forbidden'): string {
  return kind === 'forbidden'
    ? 'bg-red-500/10 text-red-300 border-red-500/30'
    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
}

function appliesToSummary(g: TelematicsGeofence): string {
  if (g.applies_to === 'all') return 'All cars'
  const count = g.car_ids?.length ?? 0
  if (count === 0) return 'No cars selected'
  return count === 1 ? '1 car' : `${count} cars`
}

export default function GeofenceList({
  geofences,
  selectedId,
  onSelect,
  onNew,
}: Props) {
  const [pending, startTransition] = useTransition()

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      await toggleGeofenceActiveAction(id, !current)
    })
  }

  function handleDelete(id: string) {
    if (typeof window !== 'undefined') {
      const ok = window.confirm('Delete this geofence? This cannot be undone.')
      if (!ok) return
    }
    startTransition(async () => {
      const res = await deleteGeofenceAction(id)
      if (res.ok && selectedId === id) onSelect(null)
    })
  }

  return (
    <div className="glass border border-white/[0.08] rounded-2xl flex flex-col overflow-hidden h-full">
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="text-white font-bold text-sm">
          Geofences
          <span className="ml-2 text-white/30 text-xs font-normal">
            {geofences.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="bg-white text-black hover:bg-white/90 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors"
        >
          New
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto divide-y divide-white/[0.06]">
        {geofences.length === 0 && (
          <li className="px-4 py-8 text-white/40 text-sm text-center">
            No geofences yet. Click &ldquo;New&rdquo; to draw your first zone.
          </li>
        )}
        {geofences.map((g) => {
          const isSelected = selectedId === g.id
          return (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => onSelect(g.id)}
                className={`w-full text-left px-4 py-3 transition-colors ${
                  isSelected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white font-semibold text-sm truncate">
                    {g.name}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider shrink-0 px-2 py-0.5 rounded border ${kindBadge(g.kind)}`}
                  >
                    {g.kind}
                  </span>
                </div>
                <div className="text-white/40 text-[11px] mt-0.5 truncate">
                  {appliesToSummary(g)}
                  {g.speed_limit_mph !== null && (
                    <span> &middot; {g.speed_limit_mph} mph limit</span>
                  )}
                </div>
              </button>

              <div className="flex items-center gap-2 px-4 pb-3 -mt-1">
                <label className="flex items-center gap-1.5 text-[11px] text-white/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={g.active}
                    disabled={pending}
                    onChange={() => handleToggle(g.id, g.active)}
                    className="w-3.5 h-3.5 rounded bg-white/5 border-white/20"
                  />
                  <span>{g.active ? 'Active' : 'Inactive'}</span>
                </label>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleDelete(g.id)}
                  className="ml-auto text-[11px] text-red-300 hover:text-red-200 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
