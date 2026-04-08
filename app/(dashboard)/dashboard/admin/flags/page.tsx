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

interface FeatureFlag {
  key: string
  label: string
  description: string
  enabled: boolean
  scope: 'global' | 'per-tenant'
}

const DEFAULT_FLAGS: FeatureFlag[] = [
  { key: 'turo_sync', label: 'Turo Email Sync', description: 'Allow tenants to sync bookings from Turo via email forwarding.', enabled: true, scope: 'global' },
  { key: 'stripe_connect', label: 'Stripe Connect', description: 'Enable payment processing via Stripe Connect for tenants.', enabled: true, scope: 'global' },
  { key: 'custom_domains', label: 'Custom Domains', description: 'Allow Pro/Enterprise tenants to configure custom domains.', enabled: false, scope: 'per-tenant' },
  { key: 'api_access', label: 'API Access', description: 'Enable REST API endpoints for Enterprise tenants.', enabled: false, scope: 'per-tenant' },
  { key: 'webhooks', label: 'Webhooks', description: 'Real-time event notifications to external endpoints.', enabled: false, scope: 'per-tenant' },
  { key: 'ai_insights', label: 'AI Insights', description: 'AI-powered fleet optimization and demand forecasting.', enabled: false, scope: 'global' },
  { key: 'multi_location', label: 'Multi-Location', description: 'Support for multiple pickup/dropoff locations per tenant.', enabled: false, scope: 'global' },
  { key: 'sms_notifications', label: 'SMS Notifications', description: 'Send SMS alerts for bookings and maintenance events.', enabled: false, scope: 'global' },
]

export default async function FeatureFlagsPage() {
  await requireSuperuser()

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-32">
      <PageHeader title="Feature Flags" description="Toggle features globally or per tenant. Changes take effect immediately." />

      {/* Flags List */}
      <div className="glass border border-white/10 rounded-3xl p-8">
        <div className="space-y-1">
          {DEFAULT_FLAGS.map((flag) => (
            <div
              key={flag.key}
              className="flex items-center justify-between p-4 rounded-xl hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/[0.04]"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-white text-sm font-medium">{flag.label}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider border ${
                    flag.scope === 'global'
                      ? 'text-blue-400/60 bg-blue-500/5 border-blue-500/10'
                      : 'text-purple-400/60 bg-purple-500/5 border-purple-500/10'
                  }`}>
                    {flag.scope}
                  </span>
                </div>
                <div className="text-white/30 text-xs mt-1">{flag.description}</div>
              </div>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" defaultChecked={flag.enabled} className="peer sr-only" />
                    <div className="w-10 h-[22px] rounded-full bg-white/10 peer-checked:bg-emerald-500/30 transition-colors" />
                    <div className="absolute top-[3px] left-[3px] w-[16px] h-[16px] rounded-full bg-white/30 peer-checked:bg-emerald-400 peer-checked:translate-x-[18px] transition-all" />
                  </div>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="glass border border-amber-500/10 rounded-3xl p-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-400/60 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h4 className="text-amber-400/80 font-bold text-sm mb-1">Feature Flag Persistence</h4>
            <p className="text-amber-400/40 text-xs leading-relaxed">
              Feature flags are currently UI placeholders. To make them persistent, create a <code className="text-amber-400/60">feature_flags</code> table in Supabase with columns: <code className="text-amber-400/60">key</code>, <code className="text-amber-400/60">enabled</code>, <code className="text-amber-400/60">tenant_id</code> (nullable for global flags).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
