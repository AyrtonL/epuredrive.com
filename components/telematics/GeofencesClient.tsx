'use client'

// components/telematics/GeofencesClient.tsx
// Client island for the Geofences page:
//   - Owns the selected geofence state
//   - Renders the left list + right editor + form
//   - Fires saveGeofenceAction via a server action on submit
import { useMemo, useState, useTransition } from 'react'
import GeofenceEditor from './GeofenceEditor'
import GeofenceList from './GeofenceList'
import { saveGeofenceAction } from '@/app/(dashboard)/dashboard/telematics/geofences/actions'
import type {
  GeoJsonPolygon,
  TelematicsGeofence,
} from '@/lib/supabase/types'

interface CarOption {
  id: number
  label: string
}

interface Props {
  initialGeofences: TelematicsGeofence[]
  cars: CarOption[]
}

interface FormState {
  id: string | null
  name: string
  kind: 'allowed' | 'forbidden'
  applies_to: 'all' | 'specific'
  car_ids: number[]
  speed_limit_mph: string
  active: boolean
  polygon: GeoJsonPolygon | null
}

function emptyForm(): FormState {
  return {
    id: null,
    name: '',
    kind: 'allowed',
    applies_to: 'all',
    car_ids: [],
    speed_limit_mph: '',
    active: true,
    polygon: null,
  }
}

function geofenceToForm(g: TelematicsGeofence): FormState {
  return {
    id: g.id,
    name: g.name,
    kind: g.kind,
    applies_to: g.applies_to,
    car_ids: g.car_ids ?? [],
    speed_limit_mph: g.speed_limit_mph === null ? '' : String(g.speed_limit_mph),
    active: g.active,
    polygon: g.polygon,
  }
}

export default function GeofencesClient({ initialGeofences, cars }: Props) {
  const [geofences] = useState<TelematicsGeofence[]>(initialGeofences)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const selectedGeofence = useMemo(
    () => (selectedId ? geofences.find((g) => g.id === selectedId) ?? null : null),
    [geofences, selectedId],
  )

  function handleSelect(id: string | null) {
    setError(null)
    setSelectedId(id)
    if (id === null) {
      setForm(emptyForm())
      return
    }
    const g = geofences.find((x) => x.id === id)
    setForm(g ? geofenceToForm(g) : emptyForm())
  }

  function handleNew() {
    setError(null)
    setSelectedId(null)
    setForm(emptyForm())
  }

  function handlePolygonChange(polygon: GeoJsonPolygon | null) {
    setForm((prev) => ({ ...prev, polygon }))
  }

  function toggleCar(carId: number) {
    setForm((prev) => {
      const has = prev.car_ids.includes(carId)
      return {
        ...prev,
        car_ids: has
          ? prev.car_ids.filter((id) => id !== carId)
          : [...prev.car_ids, carId],
      }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.polygon) {
      setError('Draw a polygon on the map before saving.')
      return
    }
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }

    const speedParsed = form.speed_limit_mph.trim()
      ? Number(form.speed_limit_mph)
      : null
    if (speedParsed !== null && (!Number.isFinite(speedParsed) || speedParsed < 1 || speedParsed > 200)) {
      setError('Speed limit must be between 1 and 200 mph.')
      return
    }

    const payload = {
      ...(form.id ? { id: form.id } : {}),
      name: form.name.trim(),
      kind: form.kind,
      polygon: form.polygon,
      applies_to: form.applies_to,
      car_ids: form.applies_to === 'all' ? [] : form.car_ids,
      speed_limit_mph: speedParsed,
      active: form.active,
    }

    startTransition(async () => {
      const res = await saveGeofenceAction(payload)
      if (!res.ok) {
        setError(res.error ?? 'Could not save geofence.')
        return
      }
      // Next render will pick up the new row via revalidatePath from the server
      // action; here we just stop the spinner. The server component re-fetches.
      if (res.id) setSelectedId(res.id)
    })
  }

  const isEditing = selectedGeofence !== null
  const title = isEditing ? 'Edit geofence' : 'New geofence'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[720px]">
      <div className="lg:col-span-3">
        <GeofenceList
          geofences={geofences}
          selectedId={selectedId}
          onSelect={handleSelect}
          onNew={handleNew}
        />
      </div>

      <div className="lg:col-span-9 flex flex-col gap-6">
        <div className="flex-1 min-h-[420px] rounded-2xl overflow-hidden border border-white/[0.08]">
          <GeofenceEditor
            key={form.id ?? 'new'}
            polygon={form.polygon}
            onChange={handlePolygonChange}
          />
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass border border-white/[0.08] rounded-2xl p-5 space-y-4"
        >
          <div className="text-white font-bold text-sm">{title}</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                Name
              </span>
              <input
                type="text"
                value={form.name}
                maxLength={80}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="mt-1 w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-white/30"
                placeholder="Airport no-go zone"
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                Kind
              </span>
              <select
                value={form.kind}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    kind: e.target.value === 'forbidden' ? 'forbidden' : 'allowed',
                  }))
                }
                className="mt-1 w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-white/30"
              >
                <option value="allowed">Allowed</option>
                <option value="forbidden">Forbidden</option>
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                Applies to
              </span>
              <select
                value={form.applies_to}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    applies_to: e.target.value === 'specific' ? 'specific' : 'all',
                  }))
                }
                className="mt-1 w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-white/30"
              >
                <option value="all">All cars</option>
                <option value="specific">Specific cars</option>
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                Speed limit (mph, optional)
              </span>
              <input
                type="number"
                min={1}
                max={200}
                value={form.speed_limit_mph}
                onChange={(e) =>
                  setForm((p) => ({ ...p, speed_limit_mph: e.target.value }))
                }
                className="mt-1 w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-white/30"
                placeholder="Leave blank for none"
              />
            </label>
          </div>

          {form.applies_to === 'specific' && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">
                Cars
              </div>
              {cars.length === 0 ? (
                <div className="text-white/40 text-xs">No cars in fleet yet.</div>
              ) : (
                <div className="max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {cars.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 text-xs text-white/80 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form.car_ids.includes(c.id)}
                        onChange={() => toggleCar(c.id)}
                        className="w-3.5 h-3.5 rounded bg-white/5 border-white/20"
                      />
                      <span className="truncate">{c.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) =>
                setForm((p) => ({ ...p, active: e.target.checked }))
              }
              className="w-4 h-4 rounded bg-white/5 border-white/20"
            />
            <span>Active</span>
          </label>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 text-xs px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="bg-white text-black hover:bg-white/90 text-sm font-bold px-5 py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              {pending ? 'Saving...' : isEditing ? 'Save changes' : 'Create geofence'}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={handleNew}
                className="text-white/60 hover:text-white text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
