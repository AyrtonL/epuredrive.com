import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import UpgradeButton from './UpgradeButton'
import DeactivateButton from './DeactivateButton'
import SubscribeTracker from './SubscribeTracker'

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; cancelled?: string }>
}) {
  const params = await searchParams
  const { supabase, tenantId } = await requireTenantId()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, plan, slug, brand_name')
    .eq('id', tenantId)
    .single()

  const plan = tenant?.plan || 'free'

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: '/month',
      features: ['Up to 5 vehicles', '1 team member', 'Basic reporting', 'Community support'],
      current: plan === 'free',
    },
    {
      name: 'Pro',
      price: '$49',
      period: '/month',
      features: ['Up to 20 vehicles', '5 team members', 'Advanced analytics & ROI', 'Turo integration', 'Custom domain', 'Priority support'],
      current: plan === 'pro',
      recommended: true,
    },
    {
      name: 'Max',
      price: '$99',
      period: '/month',
      features: ['Up to 50 vehicles', 'Unlimited team members', 'API access & webhooks', 'White-label branding', 'Dedicated account manager', 'SLA guarantee'],
      current: plan === 'max',
    },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fade-in pb-32">
      <PageHeader title="Billing & Plans" description="Manage your subscription and view invoicing history." />

      {params.success && (
        <>
          <SubscribeTracker plan={plan} />
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-2xl text-sm">
            Payment successful! Your plan will be updated shortly.
          </div>
        </>
      )}
      {params.cancelled && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-2xl text-sm">
          Checkout was cancelled. No changes were made to your plan.
        </div>
      )}

      {/* Current Plan */}
      <div className="glass border border-white/10 rounded-3xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Current Plan</div>
            <div className="text-2xl font-bold text-white capitalize">{plan}</div>
          </div>
          <div className="px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest">
            Active
          </div>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`glass rounded-3xl p-8 border transition-all duration-300 relative overflow-hidden ${
              p.recommended
                ? 'border-white/20 shadow-[0_0_40px_rgba(255,255,255,0.05)]'
                : 'border-white/[0.06] hover:border-white/10'
            }`}
          >
            {p.recommended && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-white/0 via-white/40 to-white/0" />
            )}
            <div className="mb-6">
              <h3 className="text-white font-bold text-lg">{p.name}</h3>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-black text-white">{p.price}</span>
                <span className="text-white/30 text-sm">{p.period}</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-white/60">
                  <svg className="w-4 h-4 text-emerald-400/70 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <UpgradeButton planName={p.name} isCurrent={p.current ?? false} />
          </div>
        ))}
      </div>

      {/* Invoice History */}
      <div className="glass border border-white/10 rounded-3xl p-8">
        <h3 className="text-white font-bold mb-6">Invoice History</h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="4" width="22" height="16" rx="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          </div>
          <p className="text-white/30 text-sm">No invoices yet.</p>
          <p className="text-white/20 text-xs mt-1">Invoices will appear here once you upgrade to a paid plan.</p>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass border border-red-500/20 rounded-3xl p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-red-400 font-bold">Danger Zone</h3>
            <p className="text-white/30 text-xs">Irreversible actions that affect your entire account.</p>
          </div>
        </div>
        <div className="flex items-center justify-between p-5 bg-red-500/5 border border-red-500/10 rounded-2xl">
          <div>
            <div className="text-white text-sm font-medium">Deactivate Account</div>
            <div className="text-white/30 text-xs mt-0.5">Permanently deactivate your organization and all associated data.</div>
          </div>
          <DeactivateButton />
        </div>
      </div>
    </div>
  )
}
