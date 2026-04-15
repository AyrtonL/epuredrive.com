'use client'

import { Fragment, useMemo, useState, useTransition } from 'react'
import { updateSupportTicketStatus } from '../actions'

export interface SupportTicketRow {
  id: string
  ticketNumber: string
  tenantId: string
  tenantName: string
  tenantPlan: string
  operatorName: string
  operatorEmail: string
  subject: string
  message: string
  status: 'open' | 'in_progress' | 'closed'
  createdAt: string
  updatedAt: string
}

interface Props {
  tickets: SupportTicketRow[]
}

const STATUS_LABEL: Record<SupportTicketRow['status'], string> = {
  open: 'Open',
  in_progress: 'In Progress',
  closed: 'Closed',
}

const STATUS_STYLES: Record<SupportTicketRow['status'], string> = {
  open: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  in_progress: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
  closed: 'text-white/40 bg-white/5 border-white/10',
}

type Filter = 'all' | SupportTicketRow['status']

export default function SupportTicketsManager({ tickets }: Props) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (filter === 'all') return tickets
    return tickets.filter((t) => t.status === filter)
  }, [tickets, filter])

  function handleStatusChange(ticketId: string, status: SupportTicketRow['status']) {
    setMsg('')
    startTransition(async () => {
      const result = await updateSupportTicketStatus(ticketId, status)
      if (result.error) setMsg(result.error)
      else setMsg(`Status updated to "${STATUS_LABEL[status]}".`)
    })
  }

  const counts = {
    all: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    in_progress: tickets.filter((t) => t.status === 'in_progress').length,
    closed: tickets.filter((t) => t.status === 'closed').length,
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div
          className={`p-3 rounded-xl text-sm border ${
            msg.toLowerCase().includes('error')
              ? 'bg-red-500/20 text-red-300 border-red-500/30'
              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
          }`}
        >
          {msg}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(['all', 'open', 'in_progress', 'closed'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest border transition-all ${
              filter === f
                ? 'bg-amber-400 text-black border-amber-400'
                : 'bg-white/5 text-white/50 border-white/10 hover:text-white hover:border-white/20'
            }`}
          >
            {f === 'all' ? 'All' : STATUS_LABEL[f]} ({counts[f]})
          </button>
        ))}
      </div>

      <div className="glass border border-white/10 rounded-3xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-white/30 border-b border-white/10 bg-black/20">
              <th className="px-6 py-4">Ticket</th>
              <th className="px-6 py-4">Subject</th>
              <th className="px-6 py-4">From</th>
              <th className="px-6 py-4">Tenant</th>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((t) => {
              const isOpen = expanded === t.id
              return (
                <Fragment key={t.id}>
                  <tr
                    className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : t.id)}
                  >
                    <td className="px-6 py-4">
                      <span className="text-white font-mono text-xs font-bold">{t.ticketNumber}</span>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="text-white truncate">{t.subject}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white/70 text-xs">{t.operatorName}</div>
                      <div className="text-white/40 text-[11px]">{t.operatorEmail}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white/70 text-xs">{t.tenantName}</div>
                      <div className="text-white/40 text-[10px] uppercase tracking-widest">{t.tenantPlan}</div>
                    </td>
                    <td className="px-6 py-4 text-white/50 text-xs">
                      {new Date(t.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={t.status}
                        disabled={isPending}
                        onChange={(e) =>
                          handleStatusChange(t.id, e.target.value as SupportTicketRow['status'])
                        }
                        className={`bg-transparent border rounded-lg py-1 px-2 text-[10px] font-bold tracking-widest uppercase outline-none ${STATUS_STYLES[t.status]}`}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-white/30 text-xs">
                      {isOpen ? '▾' : '▸'}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-black/30">
                      <td colSpan={7} className="px-6 py-5">
                        <div className="space-y-3 max-w-3xl">
                          <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                            Message
                          </div>
                          <div className="text-white/80 text-sm whitespace-pre-wrap leading-relaxed">
                            {t.message}
                          </div>
                          <div className="flex gap-3 pt-2">
                            <a
                              href={`mailto:${t.operatorEmail}?subject=Re: [${t.ticketNumber}] ${t.subject}`}
                              className="inline-block px-4 py-2 rounded-xl bg-amber-400 text-black text-[11px] font-bold uppercase tracking-widest hover:bg-amber-300 transition-colors"
                            >
                              Reply via Email
                            </a>
                            <div className="text-white/30 text-xs self-center">
                              Updated {new Date(t.updatedAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-white/30 text-sm">No tickets found.</div>
        )}
      </div>
    </div>
  )
}
