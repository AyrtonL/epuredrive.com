'use client'

import { useState, useTransition } from 'react'
import { useToast } from '@/components/ui/Toast'
import { setRecallStatus } from './recall-actions'

export interface CarRecall {
  id: number
  campaign_number: string
  component: string | null
  summary: string | null
  consequence: string | null
  remedy: string | null
  report_received_date: string | null
  park_it: boolean
  park_outside: boolean
  matched_make: string
  matched_model: string
  matched_year: number
  status: 'open' | 'resolved' | 'not_applicable'
}

interface Props {
  recalls: CarRecall[]
  vin: string | null
}

const STATUS_LABEL: Record<CarRecall['status'], string> = {
  open: 'Open',
  resolved: 'Repaired',
  not_applicable: 'Not applicable',
}

function RecallItem({ recall }: { recall: CarRecall }) {
  const toast = useToast()
  const [expanded, setExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const isOpen = recall.status === 'open'
  const urgent = isOpen && (recall.park_it || recall.park_outside)

  function update(status: CarRecall['status']) {
    startTransition(async () => {
      const { error } = await setRecallStatus(recall.id, status)
      if (error) toast.error(error)
      else toast.success(status === 'open' ? 'Recall reopened' : `Marked as ${STATUS_LABEL[status].toLowerCase()}`)
    })
  }

  return (
    <li className={`rounded-xl border p-4 ${urgent ? 'border-red-500/40 bg-red-500/10' : 'border-white/10 bg-white/[0.03]'} ${isOpen ? '' : 'opacity-60'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {urgent && (
            <p className="text-[11px] font-bold uppercase tracking-wider text-red-400 mb-1">
              {recall.park_it ? 'Do not drive — park until repaired' : 'Park outside — fire risk'}
            </p>
          )}
          <p className="text-sm font-semibold text-white break-words">{recall.component ?? 'Recall'}</p>
          <p className="text-xs text-white/40 mt-0.5">
            NHTSA {recall.campaign_number}
            {recall.report_received_date && ` · ${recall.report_received_date}`}
            {!isOpen && ` · ${STATUS_LABEL[recall.status]}`}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {isOpen ? (
            <>
              <button onClick={() => update('resolved')} disabled={isPending}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
                Repaired
              </button>
              <button onClick={() => update('not_applicable')} disabled={isPending}
                className="text-white/50 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
                Not my VIN
              </button>
            </>
          ) : (
            <button onClick={() => update('open')} disabled={isPending}
              className="text-white/50 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
              Reopen
            </button>
          )}
        </div>
      </div>
      {recall.summary && (
        <p className={`text-sm text-white/70 mt-2 ${expanded ? '' : 'line-clamp-2'}`}>{recall.summary}</p>
      )}
      {expanded && (
        <div className="mt-2 space-y-2 text-sm text-white/70">
          {recall.consequence && <p><span className="text-white/40">Risk: </span>{recall.consequence}</p>}
          {recall.remedy && <p><span className="text-white/40">Remedy: </span>{recall.remedy}</p>}
          <p className="text-xs text-white/40">
            Matched as {recall.matched_year} {recall.matched_make} {recall.matched_model}
          </p>
        </div>
      )}
      <button onClick={() => setExpanded((v) => !v)} className="text-xs text-white/40 hover:text-white mt-2">
        {expanded ? 'Show less' : 'Details'}
      </button>
    </li>
  )
}

export default function RecallsPanel({ recalls, vin }: Props) {
  const openCount = recalls.filter((r) => r.status === 'open').length

  return (
    <section className="mb-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 className="text-lg font-semibold text-white">
          Safety recalls{openCount > 0 && <span className="ml-2 text-red-400">{openCount} open</span>}
        </h2>
        <a
          href="https://www.nhtsa.gov/recalls"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-white/40 hover:text-white"
        >
          Verify {vin ? 'this VIN' : 'by VIN'} on nhtsa.gov ↗
        </a>
      </div>
      <p className="text-xs text-white/40 mb-3">
        New NHTSA recalls for this model, checked daily. Not every unit is affected — look up the VIN on nhtsa.gov, then mark each one.
      </p>
      <ul className="space-y-3">
        {recalls.map((r) => <RecallItem key={r.id} recall={r} />)}
      </ul>
    </section>
  )
}
