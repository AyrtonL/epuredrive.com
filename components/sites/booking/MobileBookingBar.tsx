'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatMoney } from '@/lib/utils/format'

interface Props {
  hidden: boolean
  hasDates: boolean
  totalCents: number
  days: number
  dailyRate: number
  actionLabel: string
  disabled: boolean
  onAction: () => void
}

/**
 * Phone-only bar pinned to the bottom: trip total + the next step, so the
 * customer never has to scroll ~3 screens to find "Reserve". Sits above the
 * cookie strip while that is open (see CookieConsent's data attribute).
 * Portaled to <body>: the widget's backdrop-blur would otherwise turn
 * `position: fixed` into "fixed to the widget".
 */
export default function MobileBookingBar({ hidden, hasDates, totalCents, days, dailyRate, actionLabel, disabled, onAction }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return createPortal(
    <div
      aria-hidden={hidden}
      className={`md:hidden fixed inset-x-0 bottom-0 [html[data-cookie-banner=open]_&]:bottom-[56px] z-[60] transition-transform duration-300 ${
        hidden ? 'translate-y-[calc(100%+60px)]' : 'translate-y-0'
      } px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#040404]/95 backdrop-blur-xl border-t border-white/10 flex items-center justify-between gap-4`}
    >
      <div className="min-w-0">
        {hasDates ? (
          <>
            <div className="text-xl font-black text-white tracking-tight leading-none tabular-nums">
              {formatMoney(totalCents / 100, { cents: 'always' })}
            </div>
            <div className="text-xs text-white/55 mt-1">Total · {days} day{days === 1 ? '' : 's'}</div>
          </>
        ) : (
          <>
            <div className="text-xl font-black text-white tracking-tight leading-none">
              ${dailyRate}<span className="text-xs font-semibold text-white/55 ml-1">/ day</span>
            </div>
            <div className="text-xs text-white/55 mt-1">Pick dates for the total</div>
          </>
        )}
      </div>
      <button
        type="button"
        tabIndex={hidden ? -1 : 0}
        onClick={onAction}
        disabled={disabled}
        className="shrink-0 bg-white text-black font-black uppercase tracking-[0.12em] text-xs px-6 py-3.5 rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-40"
      >
        {actionLabel}
      </button>
    </div>,
    document.body,
  )
}
