import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { getFeatureFlags } from '@/lib/supabase/feature-flags'
import PageHeader from '@/components/dashboard/PageHeader'
import { listWebhookEndpoints, listDeliveries } from './actions'
import WebhookEndpointsList from './WebhookEndpointsList'
import DeliveryLog from './DeliveryLog'

export default async function APIPage() {
  const { tenantId } = await requireTenantId()

  const flags = await getFeatureFlags(tenantId, ['api_access', 'webhooks'])

  const apiEnabled = flags['api_access']
  const webhooksEnabled = flags['webhooks']

  const endpoints = await listWebhookEndpoints()
  const deliveries = await listDeliveries()

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-32">
      <PageHeader title="API & Webhooks" description="Programmatic access to your fleet data and real-time event notifications." />

      {/* API Keys */}
      <div className={`glass border rounded-3xl p-8 relative overflow-hidden ${apiEnabled ? 'border-white/10' : 'border-white/[0.04]'}`}>
        {!apiEnabled && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <div className="text-center">
              <div className="px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest inline-block mb-3">
                Feature Not Enabled
              </div>
              <p className="text-white/40 text-sm max-w-xs">API access is not enabled for your organization. Contact your administrator.</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
              <line x1="14" y1="4" x2="10" y2="20" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-bold">API Keys</h3>
            <p className="text-white/30 text-xs">Generate and manage API keys for external integrations</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.04]">
            <div>
              <div className="text-white text-sm font-medium">Production Key</div>
              <div className="text-white/20 text-xs mt-0.5 font-mono">epd_live_••••••••••••••••</div>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs hover:text-white hover:bg-white/10 transition-colors">
                Reveal
              </button>
              <button className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs hover:text-white hover:bg-white/10 transition-colors">
                Regenerate
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.04]">
            <div>
              <div className="text-white text-sm font-medium">Test Key</div>
              <div className="text-white/20 text-xs mt-0.5 font-mono">epd_test_••••••••••••••••</div>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs hover:text-white hover:bg-white/10 transition-colors">
                Reveal
              </button>
              <button className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs hover:text-white hover:bg-white/10 transition-colors">
                Regenerate
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
          <div className="flex items-start gap-3">
            <svg className="w-4 h-4 text-amber-400/60 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-amber-400/60 text-xs leading-relaxed">
              Keep your API keys secret. Never expose them in client-side code or public repositories. Rotate keys immediately if compromised.
            </p>
          </div>
        </div>
      </div>

      {/* Webhooks */}
      <WebhookEndpointsList initialEndpoints={endpoints} webhooksEnabled={webhooksEnabled} />

      {/* Delivery Log */}
      {webhooksEnabled && endpoints.length > 0 && (
        <DeliveryLog initialDeliveries={deliveries} />
      )}

      {/* API Documentation Link */}
      <div className="glass border border-white/[0.06] rounded-3xl p-8 text-center">
        <h3 className="text-white font-bold mb-2">API Documentation</h3>
        <p className="text-white/30 text-sm mb-6">Full reference for all endpoints, authentication, and data models.</p>
        <button className="bg-white/5 border border-white/10 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-white/10 transition-all">
          View Documentation
        </button>
      </div>
    </div>
  )
}
