'use client'

import { useState, useTransition } from 'react'
import { createTenant, updateTenantPlan, deleteTenant } from '../actions'
import type { Tenant } from '@/lib/supabase/types'

interface Props {
  tenants: Tenant[]
  memberCounts: Record<string, number>
  carCounts: Record<string, number>
  bookingCounts: Record<string, number>
}

const PLAN_STYLES: Record<string, string> = {
  enterprise: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  pro: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  free: 'text-white/40 bg-white/5 border-white/10',
}

export default function TenantsManager({ tenants, memberCounts, carCounts, bookingCounts }: Props) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newPlan, setNewPlan] = useState('free')
  const [editingPlan, setEditingPlan] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function handleCreate() {
    setMsg('')
    startTransition(async () => {
      const result = await createTenant({ name: newName, slug: newSlug, plan: newPlan })
      if (result.error) {
        setMsg(result.error)
      } else {
        setMsg('Tenant created successfully.')
        setShowCreate(false)
        setNewName('')
        setNewSlug('')
        setNewPlan('free')
      }
    })
  }

  function handlePlanChange(tenantId: string, plan: string) {
    setMsg('')
    startTransition(async () => {
      const result = await updateTenantPlan(tenantId, plan)
      if (result.error) setMsg(result.error)
      else {
        setMsg('Plan updated.')
        setEditingPlan(null)
      }
    })
  }

  function handleDelete(tenantId: string) {
    setMsg('')
    startTransition(async () => {
      const result = await deleteTenant(tenantId)
      if (result.error) setMsg(result.error)
      else {
        setMsg('Tenant deleted.')
        setConfirmDelete(null)
      }
    })
  }

  const freePlan = tenants.filter(t => !t.plan || t.plan === 'free').length
  const paidPlan = tenants.filter(t => t.plan && t.plan !== 'free').length

  return (
    <div className="space-y-6">
      {/* Feedback */}
      {msg && (
        <div className={`p-3 rounded-xl text-sm border ${msg.includes('error') || msg.includes('Error') || msg.includes('taken') ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'}`}>
          {msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tenants', value: tenants.length },
          { label: 'Active', value: tenants.length },
          { label: 'Free Plan', value: freePlan },
          { label: 'Paid Plans', value: paidPlan },
        ].map((s) => (
          <div key={s.label} className="glass border border-amber-500/10 rounded-2xl p-4">
            <div className="text-[10px] font-bold text-amber-400/40 uppercase tracking-widest mb-2">{s.label}</div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Create Tenant */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-amber-400 text-black px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-amber-300 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {showCreate ? 'Cancel' : 'Create Tenant'}
        </button>
      </div>

      {showCreate && (
        <div className="glass border border-amber-500/20 rounded-3xl p-6 space-y-4">
          <h3 className="text-white font-bold text-sm">New Tenant</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest pl-1">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Company Name"
                className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white outline-none focus:ring-1 focus:ring-amber-400/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest pl-1">Slug</label>
              <input
                type="text"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="company-name"
                className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white outline-none focus:ring-1 focus:ring-amber-400/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest pl-1">Plan</label>
              <select
                value={newPlan}
                onChange={(e) => setNewPlan(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white outline-none focus:ring-1 focus:ring-amber-400/30"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={isPending || !newName.trim() || !newSlug.trim()}
              className="bg-amber-400 text-black px-8 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-amber-300 transition-all disabled:opacity-40"
            >
              {isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Tenant Table */}
      <div className="glass border border-white/10 rounded-3xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-white/30 border-b border-white/10 bg-black/20">
              <th className="px-6 py-4">Organization</th>
              <th className="px-6 py-4">Slug</th>
              <th className="px-6 py-4">Plan</th>
              <th className="px-6 py-4">Members</th>
              <th className="px-6 py-4">Cars</th>
              <th className="px-6 py-4">Bookings</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tenants.map((t) => (
              <tr key={t.id} className="hover:bg-white/[0.03] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/30 text-xs font-bold">
                      {(t.brand_name || t.name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-white font-medium">{t.brand_name || t.name}</div>
                      {t.brand_name && t.brand_name !== t.name && (
                        <div className="text-white/30 text-xs">{t.name}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-white/50 font-mono text-xs">{t.slug || '—'}</span>
                </td>
                <td className="px-6 py-4">
                  {editingPlan === t.id ? (
                    <select
                      defaultValue={t.plan || 'free'}
                      onChange={(e) => handlePlanChange(t.id, e.target.value)}
                      disabled={isPending}
                      className="bg-white/10 border border-white/10 rounded-lg py-1 px-2 text-xs text-white outline-none"
                    >
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  ) : (
                    <button
                      onClick={() => setEditingPlan(t.id)}
                      className={`inline-block px-2.5 py-1 text-[10px] font-bold tracking-widest rounded-full uppercase border cursor-pointer hover:opacity-80 transition-opacity ${PLAN_STYLES[t.plan || 'free'] ?? PLAN_STYLES.free}`}
                    >
                      {t.plan || 'free'}
                    </button>
                  )}
                </td>
                <td className="px-6 py-4 text-white/50">{memberCounts[t.id] ?? 0}</td>
                <td className="px-6 py-4 text-white/50">{carCounts[t.id] ?? 0}</td>
                <td className="px-6 py-4 text-white/50">{bookingCounts[t.id] ?? 0}</td>
                <td className="px-6 py-4">
                  {confirmDelete === t.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={isPending}
                        className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/30 transition-colors"
                      >
                        {isPending ? '...' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs hover:bg-white/10 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingPlan(t.id)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                      >
                        Edit Plan
                      </button>
                      <button
                        onClick={() => setConfirmDelete(t.id)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tenants.length === 0 && (
          <div className="text-center py-16 text-white/30 text-sm">No tenants found.</div>
        )}
      </div>
    </div>
  )
}
