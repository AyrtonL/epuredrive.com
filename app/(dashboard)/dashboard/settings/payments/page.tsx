import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'

export default async function PaymentsPage() {
  await requireTenantId()

  const stripeEnabled = false // TODO: derive from tenant config

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-32">
      <PageHeader title="Payments & Invoices" description="Manage payment processing, Stripe integration, and payout settings." />

      {/* Stripe Connect */}
      <div className={`glass border rounded-3xl p-8 lg:p-10 relative overflow-hidden group ${stripeEnabled ? 'border-white/10' : 'border-white/[0.04]'}`}>
        {!stripeEnabled && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <div className="text-center">
              <div className="px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest inline-block mb-3">
                Feature Not Enabled
              </div>
              <p className="text-white/40 text-sm max-w-xs">Stripe Connect is not enabled for your organization. Contact your administrator.</p>
            </div>
          </div>
        )}
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
                <div className="text-xs text-white/40">Accept online payments and automate payouts.</div>
              </div>
            </div>

            <button className="bg-[#635BFF] hover:bg-[#635BFF]/90 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#635BFF]/20 transition-all flex items-center gap-2">
              Connect Account
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
             <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest px-2">
               <span className="text-white/30">Currency</span>
               <span className="text-white">USD (United States Dollar)</span>
             </div>
             <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest px-2">
               <span className="text-white/30">Payout Method</span>
               <span className="text-white/60 italic">Not configured</span>
             </div>
          </div>
        </div>
      </div>

      {/* Invoices Placeholder */}
      <div className="glass border border-white/[0.06] rounded-3xl p-8">
        <h3 className="text-white font-bold mb-4">Recent Invoices</h3>
        <p className="text-white/30 text-sm">No invoices yet. Connect your Stripe account to start accepting payments and generating invoices.</p>
      </div>
    </div>
  )
}
