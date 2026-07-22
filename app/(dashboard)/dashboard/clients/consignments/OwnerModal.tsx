'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ConsignmentOwner } from '@/lib/supabase/types'
import { createOwner, updateOwner, type OwnerInput } from './actions'
import ModalPortal from '@/components/ui/ModalPortal'

interface Props {
  isOpen: boolean
  onClose: () => void
  owner?: ConsignmentOwner | null
}

const inputCls =
  'w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white'
const labelCls = 'text-[11px] font-bold text-white/50 uppercase tracking-widest'

export default function OwnerModal({ isOpen, onClose, owner }: Props) {
  const [isPending, startTransition] = useTransition()
  const [errorStr, setErrorStr] = useState<string | null>(null)
  const router = useRouter()
  const [form, setForm] = useState<Partial<ConsignmentOwner>>({})

  useEffect(() => {
    setForm(owner ?? { default_percentage: 70 })
    setErrorStr(null)
  }, [owner, isOpen])

  if (!isOpen) return null
  const isEditing = !!owner

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) {
      setErrorStr('Owner name is required.')
      return
    }
    const data: OwnerInput = {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      default_percentage: Number(form.default_percentage) || 70,
      notes: form.notes || null,
    }
    startTransition(async () => {
      const result = isEditing && owner?.id
        ? await updateOwner(owner.id, data)
        : await createOwner(data)
      if (result.error) setErrorStr(result.error)
      else { router.refresh(); onClose() }
    })
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <div className="glass w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in-up my-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
            <h3 className="text-lg font-bold text-white">{isEditing ? 'Edit Owner' : 'New Owner'}</h3>
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorStr && <div className="p-3 bg-red-500/20 text-red-300 rounded-xl text-sm border border-red-500/30">{errorStr}</div>}

            <div className="space-y-1">
              <label className={labelCls}>Owner Name</label>
              <input type="text" required placeholder="John Smith" value={form.name || ''}
                onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className={labelCls}>Email</label>
                <input type="email" value={form.email || ''}
                  onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Phone</label>
                <input type="text" value={form.phone || ''}
                  onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} />
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Default Split % (owner&apos;s share on new cars)</label>
              <input type="number" min="0" max="100" step="1" value={form.default_percentage ?? 70}
                onChange={e => setForm({ ...form, default_percentage: Number(e.target.value) })} className={inputCls} />
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Notes</label>
              <textarea rows={2} value={form.notes || ''}
                onChange={e => setForm({ ...form, notes: e.target.value })} className={`${inputCls} resize-none`} />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button type="button" onClick={onClose} className="bg-white/5 hover:bg-white/10 text-white/80 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all">Cancel</button>
              <button type="submit" disabled={isPending} className="bg-white text-black hover:bg-white/90 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50">
                {isPending ? 'Saving...' : 'Save Owner'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  )
}
