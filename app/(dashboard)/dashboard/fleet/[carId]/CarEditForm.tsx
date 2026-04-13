'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Car } from '@/lib/supabase/types'
import { updateCar } from '../actions'
import ImageUploader from '../ImageUploader'

interface Props {
  car: Car
}

interface DecodedFields {
  make?: string
  model?: string
  year?: number
  hp?: string
  seats?: number
  transmission?: string
}

export default function CarEditForm({ car }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isDecoding, setIsDecoding] = useState(false)
  const [vin, setVin] = useState(car.vin || '')
  const [decoded, setDecoded] = useState<DecodedFields>({})
  const [images, setImages] = useState<string[]>([
    ...(car.image_url ? [car.image_url] : []),
    ...(car.gallery || []),
  ].filter(Boolean))

  async function decodeVin() {
    const v = vin.trim()
    if (!v || v.length < 11) return
    setIsDecoding(true)
    setError(null)
    try {
      const res = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(v)}?format=json`
      )
      const json = await res.json()
      const r = json.Results?.[0] || {}

      const updates: DecodedFields = {}
      const make = (r.Make || '').trim()
      const model = (r.Model || '').trim()
      const year = (r.ModelYear || '').trim()
      if (make) updates.make = make
      if (model) updates.model = model
      if (year) updates.year = Number(year)

      const hp = (r.EngineHP || '').trim()
      if (hp && hp !== '0') updates.hp = `${hp} HP`

      const seats = (r.Seats || r.NumberOfSeats || '').trim()
      if (seats && seats !== '0') updates.seats = Number(seats)

      const transStyle = (r.TransmissionStyle || '').toLowerCase()
      const transSpeeds = (r.TransmissionSpeeds || '').trim()
      let transLabel = ''
      if (transStyle.includes('manual')) transLabel = 'Manual'
      else if (transStyle.includes('continuously variable')) transLabel = 'CVT'
      else if (transStyle.includes('automatic') && transSpeeds && transSpeeds !== '0')
        transLabel = `${transSpeeds}-Speed`
      else if (transStyle.includes('automatic')) transLabel = 'Auto'
      if (transLabel) updates.transmission = transLabel

      setDecoded(updates)
    } catch {
      setError('VIN decode failed. Check your connection.')
    } finally {
      setIsDecoding(false)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = {
      make: (fd.get('make') as string) || decoded.make || car.make,
      model: (fd.get('model') as string) || decoded.model || car.model,
      model_full: (fd.get('model_full') as string) || null,
      year: fd.get('year') ? Number(fd.get('year')) : (decoded.year ?? null),
      daily_rate: fd.get('daily_rate') ? Number(fd.get('daily_rate')) : null,
      category: (fd.get('category') as string) || null,
      seats: fd.get('seats') ? Number(fd.get('seats')) : (decoded.seats ?? null),
      transmission: (fd.get('transmission') as string) || decoded.transmission || null,
      hp: (fd.get('hp') as string) || decoded.hp || null,
      mileage: fd.get('mileage') ? Number(fd.get('mileage')) : null,
      description: (fd.get('description') as string) || null,
      status: fd.get('status') as string,
      vin: vin || null,
      color: (fd.get('color') as string) || null,
      plate: (fd.get('plate') as string) || null,
      image_url: images[0] || null,
      gallery: images.slice(1).length > 0 ? images.slice(1) : null,
    }

    startTransition(async () => {
      const result = await updateCar(car.id, data)
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl p-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {[
          { name: 'make', label: 'Make', defaultValue: decoded.make ?? car.make },
          { name: 'model', label: 'Model', defaultValue: decoded.model ?? car.model },
          { name: 'model_full', label: 'Full model name', defaultValue: car.model_full ?? '' },
          { name: 'year', label: 'Year', type: 'number', defaultValue: decoded.year ?? car.year ?? '' },
          { name: 'daily_rate', label: 'Daily rate ($)', type: 'number', defaultValue: car.daily_rate ?? '' },
          { name: 'seats', label: 'Seats', type: 'number', defaultValue: decoded.seats ?? car.seats ?? '' },
          { name: 'transmission', label: 'Transmission', defaultValue: decoded.transmission ?? car.transmission ?? '' },
          { name: 'hp', label: 'Horsepower', defaultValue: decoded.hp ?? car.hp ?? '' },
          { name: 'mileage', label: 'Mileage (mi)', type: 'number', defaultValue: car.mileage ?? '' },
          { name: 'category', label: 'Category', defaultValue: car.category ?? '' },
        ].map((field) => (
          <div key={field.name}>
            <label className="block text-sm text-white/60 mb-1">{field.label}</label>
            <input
              key={`${field.name}-${String(field.defaultValue)}`}
              name={field.name}
              type={field.type ?? 'text'}
              defaultValue={String(field.defaultValue)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30"
            />
          </div>
        ))}

        <div>
          <label className="block text-sm text-white/60 mb-1">Status</label>
          <select
            name="status"
            defaultValue={car.status ?? 'active'}
            className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30"
          >
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Retired</option>
          </select>
        </div>
      </div>

      {/* Color & Plate */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-white/60 mb-1">Color</label>
          <input
            type="text"
            name="color"
            placeholder="e.g. Blue, White..."
            defaultValue={car.color ?? ''}
            className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30"
          />
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-1">License Plate</label>
          <input
            type="text"
            name="plate"
            placeholder="e.g. ABC1234"
            defaultValue={car.plate ?? ''}
            className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30"
          />
        </div>
      </div>

      {/* VIN Decode */}
      <div>
        <label className="block text-sm text-white/60 mb-1">VIN</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. 1HGBH41JXMN109186"
            value={vin}
            onChange={e => setVin(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30"
          />
          <button
            type="button"
            onClick={decodeVin}
            disabled={isDecoding || vin.trim().length < 11}
            className="bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {isDecoding ? 'Decoding...' : 'Decode VIN'}
          </button>
        </div>
      </div>

      {/* Image Upload */}
      <ImageUploader images={images} onChange={setImages} />

      <div>
        <label className="block text-sm text-white/60 mb-1">Description</label>
        <textarea
          name="description"
          defaultValue={car.description ?? ''}
          rows={4}
          className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="bg-white text-black font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-white/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard/fleet')}
          className="text-sm text-white/40 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
