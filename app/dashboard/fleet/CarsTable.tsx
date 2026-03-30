'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { Car } from '@/lib/supabase/types'
import { deleteCar } from './actions'

interface Props {
  cars: Car[]
}

export default function CarsTable({ cars }: Props) {
  const [filter, setFilter] = useState('')
  const [, startTransition] = useTransition()

  const filtered = cars.filter((c) => {
    const q = filter.toLowerCase()
    return (
      !q ||
      c.make.toLowerCase().includes(q) ||
      c.model.toLowerCase().includes(q) ||
      (c.model_full ?? '').toLowerCase().includes(q)
    )
  })

  function handleDelete(id: number) {
    if (!confirm('Delete this car? This cannot be undone.')) return
    startTransition(async () => {
      await deleteCar(id)
    })
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search cars…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/40 border-b border-white/10">
              <th className="pb-3 pr-4 font-medium">Car</th>
              <th className="pb-3 pr-4 font-medium">Year</th>
              <th className="pb-3 pr-4 font-medium">Category</th>
              <th className="pb-3 pr-4 font-medium">Rate/day</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-white/5 transition-colors">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    {c.image_url && (
                      <img
                        src={c.image_url.startsWith('http') ? c.image_url : `/${c.image_url}`}
                        alt=""
                        className="w-12 h-8 object-cover rounded-lg"
                      />
                    )}
                    <span className="font-medium text-white">
                      {c.make} {c.model_full || c.model}
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-white/60">{c.year ?? '—'}</td>
                <td className="py-3 pr-4 text-white/60 capitalize">{c.category ?? '—'}</td>
                <td className="py-3 pr-4 text-white font-medium">
                  {c.daily_rate != null ? `$${Number(c.daily_rate).toFixed(0)}` : '—'}
                </td>
                <td className="py-3 pr-4">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    c.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    c.status === 'retired' ? 'bg-white/10 text-white/40' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {c.status ?? 'active'}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/dashboard/fleet/${c.id}`}
                      className="text-xs text-white/50 hover:text-white transition-colors"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-xs text-white/20 hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
