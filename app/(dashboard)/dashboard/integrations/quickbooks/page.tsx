import PageHeader from '@/components/dashboard/PageHeader'

export default function QuickBooksPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader title="QuickBooks" description="Connect your QuickBooks Online account to sync income and expenses automatically." />
      <div className="glass border border-white/[0.06] rounded-3xl p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </svg>
        </div>
        <div className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs font-semibold uppercase tracking-widest mb-4">
          Coming Soon
        </div>
        <h3 className="text-white font-bold text-lg mb-2">QuickBooks Integration</h3>
        <p className="text-white/40 text-sm max-w-md mx-auto">
          Automatically sync your income and expenses with QuickBooks Online. This integration is currently under development and will be available soon.
        </p>
      </div>
    </div>
  )
}
