'use client'

import { useState, useTransition } from 'react'
import { updateTenantPlan } from '../actions'

interface TenantSummary {
  id: string
  name: string
  plan: string
}

interface Props {
  planCounts: Record<string, number>
  tenants: TenantSummary[]
}

const PLAN_DEFINITIONS = [
  {
    name: 'Free',
    slug: 'free',
    price: 0,
    color: 'border-white/10 text-white/60',
    limits: { vehicles: 5, members: 1, integrations: false, api: false, customDomain: false },
  },
  {
    name: 'Pro',
    slug: 'pro',
    price: 49,
    color: 'border-blue-500/20 text-blue-400',
    limits: { vehicles: 25, members: 5, integrations: true, api: false, customDomain: true },
  },
  {
    name: 'Max',
    slug: 'max',
    price: 99,
    color: 'border-amber-500/20 text-amber-400',
    limits: { vehicles: 60, members: -1, integrations: true, api: true, customDomain: false },
  },
]

export default function PlansManager({ planCounts, tenants }: Props) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')
  const [changingTenant, setChangingTenant] = useState<string | null>(null)

  function handleChangePlan(tenantId: string, plan: string) {
    setMsg('')
    startTransition(async () => {
      const result = await updateTenantPlan(tenantId, plan)
      if (result.error) setMsg(result.error)
      else {
        setMsg('Plan updated.')
        setChangingTenant(null)
      }
    })
  }

  return (
    <div className="space-y-10">
      {msg && (
        <div className={`p-3 rounded-xl text-sm border ${msg.includes('Error') || msg.includes('error') ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'}`}>
          {msg}
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLAN_DEFINITIONS.map((plan) => (
          <div key={plan.slug} className={`glass border rounded-3xl p-8 ${plan.color}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">{plan.name}</h3>
              <span className={`px-2.5 py-1 text-[10px] font-bold tracking-widest rounded-full uppercase border ${plan.color} bg-white/5`}>
                {planCounts[plan.slug] ?? 0} tenants
              </span>
            </div>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-3xl font-black text-white">${plan.price}</span>
              <span className="text-white/30 text-sm">/month</span>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Vehicles', value: plan.limits.vehicles === -1 ? 'Unlimited' : String(plan.limits.vehicles) },
                { label: 'Team Members', value: plan.limits.members === -1 ? 'Unlimited' : String(plan.limits.members) },
                { label: 'Integrations', value: plan.limits.integrations },
                { label: 'API Access', value: plan.limits.api },
                { label: 'Custom Domain', value: plan.limits.customDomain },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <span className="text-white/40">{item.label}</span>
                  {typeof item.value === 'boolean' ? (
                    <span className={item.value ? 'text-emerald-400' : 'text-white/20'}>
                      {item.value ? 'Yes' : 'No'}
                    </span>
                  ) : (
                    <span className="text-white/70 font-medium">{item.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Projection */}
      <div className="glass border border-white/10 rounded-3xl p-8">
        <h3 className="text-white font-bold mb-6">Revenue Projection</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {PLAN_DEFINITIONS.map((plan) => {
            const count = planCounts[plan.slug] ?? 0
            const mrr = count * plan.price
            return (
              <div key={plan.slug} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">{plan.name}</div>
                <div className="text-xl font-bold text-white">${mrr.toLocaleString()}</div>
                <div className="text-[10px] text-white/20 mt-1">{count} x ${plan.price}/mo</div>
              </div>
            )
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-white/5 text-center">
          <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Total MRR</div>
          <div className="text-2xl font-black text-amber-400">
            ${PLAN_DEFINITIONS.reduce((sum, p) => sum + (planCounts[p.slug] ?? 0) * p.price, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Tenant Plan Assignment */}
      <div className="glass border border-white/10 rounded-3xl p-8">
        <h3 className="text-white font-bold mb-6">Tenant Plan Assignment</h3>
        <div className="space-y-2">
          {tenants.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] transition-colors"
            >
              <div className="text-white text-sm font-medium">{t.name}</div>
              {changingTenant === t.id ? (
                <select
                  defaultValue={t.plan}
                  onChange={(e) => handleChangePlan(t.id, e.target.value)}
                  disabled={isPending}
                  className="bg-white/10 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white outline-none"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="max">Max</option>
                </select>
              ) : (
                <button
                  onClick={() => setChangingTenant(t.id)}
                  className={`inline-block px-2.5 py-1 text-[10px] font-bold tracking-widest rounded-full uppercase border cursor-pointer hover:opacity-80 transition-opacity ${
                    t.plan === 'max' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                    : t.plan === 'pro' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                    : 'text-white/40 bg-white/5 border-white/10'
                  }`}
                >
                  {t.plan}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
