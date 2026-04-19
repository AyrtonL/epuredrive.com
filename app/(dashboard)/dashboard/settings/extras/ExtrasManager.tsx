'use client'

import { useState, useTransition } from 'react'
import { createExtra, updateExtra, deleteExtra } from './actions'
import type { RentalExtra } from '@/lib/supabase/types'

interface Props {
  extras: RentalExtra[]
}

const EMPTY_FORM: { name: string; description: string; pricing_type: 'per_day' | 'flat'; price: string } = { name: '', description: '', pricing_type: 'per_day', price: '' }

export default function ExtrasManager({ extras }: Props) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function flash(message: string, type: 'ok' | 'err' = 'ok') {
    setMsg(message)
    setMsgType(type)
  }

  function handleCreate() {
    const price = parseFloat(form.price)
    if (isNaN(price) || price <= 0) { flash('Price must be greater than 0.', 'err'); return }
    startTransition(async () => {
      const result = await createExtra({
        name: form.name,
        description: form.description || undefined,
        pricing_type: form.pricing_type,
        price,
      })
      if (result.error) { flash(result.error, 'err') }
      else {
        flash('Extra created.')
        setShowCreate(false)
        setForm(EMPTY_FORM)
      }
    })
  }

  function startEdit(extra: RentalExtra) {
    setEditingId(extra.id)
    setEditForm({
      name: extra.name,
      description: extra.description || '',
      pricing_type: extra.pricing_type,
      price: String(extra.price),
    })
  }

  function handleUpdate(id: string) {
    const price = parseFloat(editForm.price)
    if (isNaN(price) || price <= 0) { flash('Price must be greater than 0.', 'err'); return }
    startTransition(async () => {
      const result = await updateExtra(id, {
        name: editForm.name,
        description: editForm.description || null,
        pricing_type: editForm.pricing_type,
        price,
      })
      if (result.error) flash(result.error, 'err')
      else { flash('Extra updated.'); setEditingId(null) }
    })
  }

  function handleToggle(extra: RentalExtra) {
    startTransition(async () => {
      const result = await updateExtra(extra.id, { is_active: !extra.is_active })
      if (result.error) flash(result.error, 'err')
      else flash(`${extra.name} ${extra.is_active ? 'disabled' : 'enabled'}.`)
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteExtra(id)
      if (result.error) flash(result.error, 'err')
      else { flash('Extra deleted.'); setConfirmDelete(null) }
    })
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`p-3 rounded-xl text-sm border ${msgType === 'err' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'}`}>
          {msg}
        </div>
      )}

      {/* Create Button */}
      <div className="flex justify-end">
        <button
          onClick={() => { setShowCreate(!showCreate); setMsg('') }}
          className="bg-amber-400 text-black px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-amber-300 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {showCreate ? 'Cancel' : 'Add Extra'}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="glass border border-amber-500/20 rounded-3xl p-6 space-y-4">
          <h3 className="text-white font-bold text-sm">New Rental Extra</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest pl-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. GPS Navigation"
                className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white outline-none focus:ring-1 focus:ring-amber-400/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest pl-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Optional short description"
                className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white outline-none focus:ring-1 focus:ring-amber-400/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest pl-1">Pricing Type</label>
              <select
                value={form.pricing_type}
                onChange={e => setForm({ ...form, pricing_type: e.target.value as 'per_day' | 'flat' })}
                className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white outline-none focus:ring-1 focus:ring-amber-400/30"
              >
                <option value="per_day">Per Day</option>
                <option value="flat">Flat Fee</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest pl-1">Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
                className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white outline-none focus:ring-1 focus:ring-amber-400/30"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={isPending || !form.name.trim() || !form.price}
              className="bg-amber-400 text-black px-8 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-amber-300 transition-all disabled:opacity-40"
            >
              {isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Extras List */}
      {extras.length === 0 && !showCreate ? (
        <div className="glass border border-white/10 rounded-3xl p-16 text-center">
          <div className="text-white/20 text-sm mb-2">No rental extras configured yet.</div>
          <div className="text-white/10 text-xs">Add extras like GPS, child seats, or insurance that customers can select during booking.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {extras.map(extra => (
            <div
              key={extra.id}
              className={`glass border rounded-2xl p-5 transition-all ${extra.is_active ? 'border-white/10' : 'border-white/5 opacity-50'}`}
            >
              {editingId === extra.id ? (
                /* Edit Mode */
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest pl-1">Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white outline-none focus:ring-1 focus:ring-amber-400/30"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest pl-1">Description</label>
                      <input
                        type="text"
                        value={editForm.description}
                        onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white outline-none focus:ring-1 focus:ring-amber-400/30"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest pl-1">Pricing Type</label>
                      <select
                        value={editForm.pricing_type}
                        onChange={e => setEditForm({ ...editForm, pricing_type: e.target.value as 'per_day' | 'flat' })}
                        className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white outline-none focus:ring-1 focus:ring-amber-400/30"
                      >
                        <option value="per_day">Per Day</option>
                        <option value="flat">Flat Fee</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest pl-1">Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={editForm.price}
                        onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                        className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white outline-none focus:ring-1 focus:ring-amber-400/30"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 rounded-lg bg-white/5 text-white/40 text-xs hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleUpdate(extra.id)}
                      disabled={isPending}
                      className="px-6 py-2 rounded-lg bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition-colors disabled:opacity-40"
                    >
                      {isPending ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Display Mode */
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm truncate">{extra.name}</span>
                        <span className={`inline-block px-2 py-0.5 text-[9px] font-bold tracking-widest rounded-full uppercase border ${
                          extra.pricing_type === 'per_day'
                            ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                            : 'text-violet-400 bg-violet-500/10 border-violet-500/20'
                        }`}>
                          {extra.pricing_type === 'per_day' ? 'Per Day' : 'Flat'}
                        </span>
                        {!extra.is_active && (
                          <span className="inline-block px-2 py-0.5 text-[9px] font-bold tracking-widest rounded-full uppercase border text-white/30 bg-white/5 border-white/10">
                            Disabled
                          </span>
                        )}
                      </div>
                      {extra.description && (
                        <span className="text-white/30 text-xs truncate mt-0.5">{extra.description}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-white font-bold text-sm">
                      ${Number(extra.price).toFixed(2)}
                      {extra.pricing_type === 'per_day' && <span className="text-white/30 text-xs">/day</span>}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggle(extra)}
                        disabled={isPending}
                        className={`w-10 h-5 rounded-full transition-colors relative ${extra.is_active ? 'bg-emerald-500/30' : 'bg-white/10'}`}
                        title={extra.is_active ? 'Disable' : 'Enable'}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${extra.is_active ? 'left-5 bg-emerald-400' : 'left-0.5 bg-white/30'}`} />
                      </button>
                      <button
                        onClick={() => startEdit(extra)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                      >
                        Edit
                      </button>
                      {confirmDelete === extra.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(extra.id)}
                            disabled={isPending}
                            className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/30 transition-colors"
                          >
                            {isPending ? '...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs hover:bg-white/10 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(extra.id)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
