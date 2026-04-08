import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'

async function requireSuperuser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'superuser') redirect('/dashboard')
  return supabase
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
    name: 'Enterprise',
    slug: 'enterprise',
    price: 149,
    color: 'border-violet-500/20 text-violet-400',
    limits: { vehicles: -1, members: -1, integrations: true, api: true, customDomain: true },
  },
]

export default async function AdminPlansPage() {
  const supabase = await requireSuperuser()

  const { data: tenants } = await supabase.from('tenants').select('plan')
  const tenantRows = tenants ?? []
  const planCounts: Record<string, number> = {}
  for (const t of tenantRows) {
    const p = t.plan || 'free'
    planCounts[p] = (planCounts[p] ?? 0) + 1
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fade-in pb-32">
      <PageHeader title="Plans & Billing" description="Configure plan tiers, pricing, and tenant limits." />

      {/* Plan Cards */}
      <div className="grid md:grid-cols-3 gap-6">
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
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Vehicles</span>
                <span className="text-white/70 font-medium">{plan.limits.vehicles === -1 ? 'Unlimited' : plan.limits.vehicles}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Team Members</span>
                <span className="text-white/70 font-medium">{plan.limits.members === -1 ? 'Unlimited' : plan.limits.members}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Integrations</span>
                <span className={plan.limits.integrations ? 'text-emerald-400' : 'text-white/20'}>
                  {plan.limits.integrations ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">API Access</span>
                <span className={plan.limits.api ? 'text-emerald-400' : 'text-white/20'}>
                  {plan.limits.api ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Custom Domain</span>
                <span className={plan.limits.customDomain ? 'text-emerald-400' : 'text-white/20'}>
                  {plan.limits.customDomain ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            <button className="mt-6 w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 text-xs font-bold hover:text-white hover:bg-white/10 transition-all">
              Edit Plan
            </button>
          </div>
        ))}
      </div>

      {/* Revenue Projection */}
      <div className="glass border border-white/10 rounded-3xl p-8">
        <h3 className="text-white font-bold mb-6">Revenue Projection</h3>
        <div className="grid grid-cols-3 gap-6 text-center">
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
      </div>
    </div>
  )
}
