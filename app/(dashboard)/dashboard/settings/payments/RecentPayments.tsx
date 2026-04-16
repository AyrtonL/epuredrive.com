import type { RecentPayment } from './actions'

interface RecentPaymentsProps {
  payments: RecentPayment[]
  chargesEnabled: boolean
}

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const STATUS_STYLES: Record<string, { dot: string; text: string; label: string }> = {
  succeeded: { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Paid' },
  pending: { dot: 'bg-amber-400', text: 'text-amber-400', label: 'Pending' },
  failed: { dot: 'bg-red-400', text: 'text-red-400', label: 'Failed' },
}

export default function RecentPayments({ payments, chargesEnabled }: RecentPaymentsProps) {
  if (!chargesEnabled) {
    return (
      <div className="glass border border-white/[0.06] rounded-3xl p-8">
        <h3 className="text-white font-bold mb-4">Recent Payments</h3>
        <p className="text-white/30 text-sm">
          Connect your Stripe account to start accepting payments.
        </p>
      </div>
    )
  }

  if (payments.length === 0) {
    return (
      <div className="glass border border-white/[0.06] rounded-3xl p-8">
        <h3 className="text-white font-bold mb-4">Recent Payments</h3>
        <p className="text-white/30 text-sm">
          No payments yet. Payments will appear here once customers complete rentals.
        </p>
      </div>
    )
  }

  const totalRevenue = payments
    .filter(p => p.status === 'succeeded')
    .reduce((sum, p) => sum + p.net, 0)

  const totalPayments = payments.filter(p => p.status === 'succeeded').length

  return (
    <div className="glass border border-white/[0.06] rounded-3xl p-8 lg:p-10 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-all duration-700" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-black italic tracking-tight uppercase">Recent Payments</h3>
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Rental Transactions</p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-1">Total Revenue</p>
            <p className="text-xl font-black text-white">{formatCurrency(totalRevenue, 'usd')}</p>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-1">Payments</p>
            <p className="text-xl font-black text-white">{totalPayments}</p>
          </div>
        </div>

        {/* Payments table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] text-white/30 uppercase tracking-widest font-bold border-b border-white/5">
                <th className="text-left pb-3 pr-4">Date</th>
                <th className="text-left pb-3 pr-4">Description</th>
                <th className="text-left pb-3 pr-4">Customer</th>
                <th className="text-left pb-3 pr-4">Status</th>
                <th className="text-right pb-3 pr-4">Fees</th>
                <th className="text-right pb-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(payment => {
                const style = STATUS_STYLES[payment.status] || STATUS_STYLES.pending
                return (
                  <tr key={payment.id} className="border-b border-white/[0.03] last:border-0">
                    <td className="py-3 pr-4 text-xs text-white/50 whitespace-nowrap">
                      {formatDate(payment.created)}
                    </td>
                    <td className="py-3 pr-4 text-xs text-white/70 max-w-[200px] truncate">
                      {payment.description || 'Rental payment'}
                    </td>
                    <td className="py-3 pr-4 text-xs text-white/50 max-w-[160px] truncate">
                      {payment.customerEmail || '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        <span className={`text-xs font-medium ${style.text}`}>{style.label}</span>
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-white/30 text-right whitespace-nowrap">
                      {formatCurrency(payment.fee, payment.currency)}
                    </td>
                    <td className="py-3 text-xs font-bold text-white text-right whitespace-nowrap">
                      {formatCurrency(payment.amount, payment.currency)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
