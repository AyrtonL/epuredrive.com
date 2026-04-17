import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { isFeatureEnabled } from '@/lib/supabase/feature-flags'
import PageHeader from '@/components/dashboard/PageHeader'
import { getConnectAccountStatus, getRecentPayments } from './actions'
import ConnectButton from './ConnectButton'
import SquareConnectButton from './SquareConnectButton'
import PaymentProcessorToggle from './PaymentProcessorToggle'
import RentalFeesForm from './RentalFeesForm'
import RecentPayments from './RecentPayments'

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ connected?: string; square_connected?: string; error?: string }> }) {
  const { supabase, tenantId } = await requireTenantId()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('fuel_charge_per_level, plan, square_merchant_id, square_location_id, payment_processor, stripe_account_id')
    .eq('id', tenantId)
    .single()

  const plan = tenant?.plan || 'free'
  const FEE_BY_PLAN: Record<string, number> = { max: 0, enterprise: 0, pro: 1, starter: 1.5, free: 2 }
  const feeRate = FEE_BY_PLAN[plan] ?? 2
  const params = await searchParams
  const status = await getConnectAccountStatus()
  const payments = status.chargesEnabled ? await getRecentPayments() : []
  const justConnected = params.connected === 'true'
  const squareEnabled = await isFeatureEnabled(tenantId, 'square_payments')

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-32">
      <PageHeader title="Payments & Invoices" description="Manage payment processing, Stripe integration, and payout settings." />

      {justConnected && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-5 py-4 rounded-2xl flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Stripe account connected successfully. You can now accept online payments.
        </div>
      )}

      {squareEnabled && params.square_connected === 'true' && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-5 py-4 rounded-2xl flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Square account connected successfully.
        </div>
      )}

      {/* Stripe Connect */}
      <div className="glass border border-white/10 rounded-3xl p-8 lg:p-10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-all duration-700" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-black italic tracking-tight uppercase">Stripe Integration</h3>
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Payments & Payouts</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#635BFF]/10 flex items-center justify-center text-[#635BFF]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M13.911 8.021l-3.327.702.433 2.039 3.327-.702-.433-2.039zm3.876-1.579l-3.328.702.433 2.039 3.327-.702-.432-2.039zm-7.753 3.158l-3.328.702.433 2.039 3.327-.702-.433-2.039zm12.966-2.737c0-2.039-1.652-3.691-3.691-3.691H4.691C2.652 3.174 1 4.826 1 6.865v10.27c0 2.039 1.652 3.691 3.691 3.691h14.618c2.039 0 3.691-1.652 3.691-3.691V6.865zm-2.039 10.27c0 .913-.739 1.652-1.652 1.652H4.691c-.913 0-1.652-.739-1.652-1.652V6.865c0-.913.739-1.652 1.652-1.652h14.618c.913 0 1.652.739 1.652 1.652v10.27z"/></svg>
              </div>
              <div>
                <div className="text-white font-bold text-sm">Stripe Connect</div>
                {status.connected && status.chargesEnabled ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-xs text-emerald-400 font-medium">Connected — accepting payments</span>
                  </div>
                ) : status.connected && !status.detailsSubmitted ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="text-xs text-amber-400 font-medium">Onboarding incomplete — finish setup</span>
                  </div>
                ) : (
                  <div className="text-xs text-white/40">Accept online payments and automate payouts.</div>
                )}
              </div>
            </div>

            {status.connected && status.chargesEnabled ? (
              <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest">
                Active
              </div>
            ) : (
              <ConnectButton />
            )}
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest px-2">
              <span className="text-white/30">Currency</span>
              <span className="text-white">USD (United States Dollar)</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest px-2">
              <span className="text-white/30">Charges Enabled</span>
              <span className={status.chargesEnabled ? 'text-emerald-400' : 'text-white/60 italic'}>
                {status.chargesEnabled ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest px-2">
              <span className="text-white/30">Payouts Enabled</span>
              <span className={status.payoutsEnabled ? 'text-emerald-400' : 'text-white/60 italic'}>
                {status.payoutsEnabled ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Square Integration */}
      {squareEnabled && <div className="glass border border-white/10 rounded-3xl p-8 lg:p-10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-all duration-700" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-white/5 text-white">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.5 2A2.5 2.5 0 0 0 2 4.5v15A2.5 2.5 0 0 0 4.5 22h15a2.5 2.5 0 0 0 2.5-2.5v-15A2.5 2.5 0 0 0 19.5 2h-15Zm3 6h9a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-black italic tracking-tight uppercase">Square Integration</h3>
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">In-Person & Online Payments</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.5 2A2.5 2.5 0 0 0 2 4.5v15A2.5 2.5 0 0 0 4.5 22h15a2.5 2.5 0 0 0 2.5-2.5v-15A2.5 2.5 0 0 0 19.5 2h-15Zm3 6h9a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
                </svg>
              </div>
              <div>
                <div className="text-white font-bold text-sm">Square Connect</div>
                {tenant?.square_merchant_id ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-xs text-emerald-400 font-medium">Connected — accepting payments</span>
                  </div>
                ) : (
                  <div className="text-xs text-white/40">Accept in-person and online payments via Square.</div>
                )}
              </div>
            </div>

            <SquareConnectButton
              connected={!!tenant?.square_merchant_id}
              merchantId={tenant?.square_merchant_id ?? null}
              locationId={tenant?.square_location_id ?? null}
            />
          </div>
        </div>
      </div>}

      {/* Payment Processor Toggle */}
      {squareEnabled && status.chargesEnabled && tenant?.square_merchant_id && (
        <div className="glass border border-white/10 rounded-3xl p-8 lg:p-10">
          <PaymentProcessorToggle
            current={tenant?.payment_processor || 'stripe'}
            stripeConnected={status.chargesEnabled}
            squareConnected={!!tenant?.square_merchant_id}
          />
        </div>
      )}

      {/* Transaction Fee Info */}
      {status.chargesEnabled && (
        <div className="glass border border-white/[0.06] rounded-3xl p-8 lg:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-black italic tracking-tight uppercase">Transaction Fee</h3>
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Per Online Payment</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white font-bold text-2xl">{feeRate}%</p>
                <p className="text-white/40 text-xs mt-0.5">Your current rate ({plan.charAt(0).toUpperCase() + plan.slice(1)} plan)</p>
              </div>
              {feeRate > 0 && (
                <a href="/dashboard/settings/billing"
                  className="px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-bold uppercase tracking-widest hover:bg-violet-500/20 transition-colors">
                  Upgrade to lower fee
                </a>
              )}
            </div>

            <div className="space-y-2 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Free</span>
                <span className={plan === 'free' ? 'text-white font-bold' : 'text-white/40'}>2%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Starter</span>
                <span className={plan === 'starter' ? 'text-white font-bold' : 'text-white/40'}>1.5%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Pro</span>
                <span className={plan === 'pro' ? 'text-white font-bold' : 'text-white/40'}>1%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Max</span>
                <span className={plan === 'max' ? 'text-white font-bold' : 'text-white/40'}>0%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Enterprise</span>
                <span className={plan === 'enterprise' ? 'text-white font-bold' : 'text-white/40'}>Custom</span>
              </div>
            </div>

            <p className="text-white/30 text-[11px] mt-4 leading-relaxed">
              This fee is automatically deducted from each online payment before funds are deposited to your Stripe account.
              Stripe&apos;s own processing fee (2.9% + $0.30) applies separately.
              See our <a href="/terms#transaction-fees" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">Terms of Service</a> for details.
            </p>
          </div>
        </div>
      )}

      {/* Recent Payments */}
      <RecentPayments payments={payments} chargesEnabled={status.chargesEnabled} />

      {/* Rental Fees */}
      <div className="glass border border-white/10 rounded-3xl p-8 lg:p-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-black italic tracking-tight uppercase">Rental Fees</h3>
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Fuel & Charges</p>
          </div>
        </div>
        <RentalFeesForm initialValue={tenant?.fuel_charge_per_level ?? null} />
      </div>
    </div>
  )
}
