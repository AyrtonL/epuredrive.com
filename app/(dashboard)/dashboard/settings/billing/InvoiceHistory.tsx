'use client'

import { useEffect, useState } from 'react'

interface Invoice {
  id: string
  number: string | null
  amount: number
  currency: string
  status: string
  created: number
  pdf: string | null
  hosted_url: string | null
  period_start: number
  period_end: number
}

export default function InvoiceHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stripe/invoices')
      .then(r => r.json())
      .then(data => setInvoices(data.invoices ?? []))
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false))
  }, [])

  function formatDate(ts: number) {
    return new Date(ts * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function formatAmount(cents: number, currency: string) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100)
  }

  if (loading) {
    return (
      <div className="glass border border-white/10 rounded-3xl p-8">
        <h3 className="text-white font-bold mb-6">Invoice History</h3>
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
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
    )
  }

  return (
    <div className="glass border border-white/10 rounded-3xl p-8">
      <h3 className="text-white font-bold mb-6">Invoice History</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/30 text-[10px] font-bold uppercase tracking-[0.15em] border-b border-white/[0.06]">
              <th className="text-left pb-4 pr-4">Invoice</th>
              <th className="text-left pb-4 pr-4">Date</th>
              <th className="text-left pb-4 pr-4">Period</th>
              <th className="text-right pb-4 pr-4">Amount</th>
              <th className="text-center pb-4">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td className="py-4 pr-4">
                  <span className="text-white/60 font-mono text-xs">{inv.number ?? inv.id.slice(-8)}</span>
                </td>
                <td className="py-4 pr-4 text-white/50">{formatDate(inv.created)}</td>
                <td className="py-4 pr-4 text-white/40 text-xs">
                  {formatDate(inv.period_start)} — {formatDate(inv.period_end)}
                </td>
                <td className="py-4 pr-4 text-right text-white font-medium">
                  {formatAmount(inv.amount, inv.currency)}
                </td>
                <td className="py-4 text-center">
                  {inv.pdf ? (
                    <a
                      href={inv.pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 text-xs transition-all"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      PDF
                    </a>
                  ) : (
                    <span className="text-white/20 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
