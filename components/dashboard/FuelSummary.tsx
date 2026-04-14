'use client'

import { getFuelDiscrepancy } from '@/lib/utils/fuel-utils'

const FUEL_EMOJI: Record<string, string> = {
  Full: '🟢',
  '3/4': '🟡',
  '1/2': '🟠',
  '1/4': '🔴',
  Empty: '⚫',
}

interface FuelSummaryProps {
  fuelOut: string | null
  fuelIn: string | null
  chargePerLevel: number
  amountOutstanding: number | null
  onApplyCharge: (newAmount: number) => void
}

export default function FuelSummary({
  fuelOut,
  fuelIn,
  chargePerLevel,
  amountOutstanding,
  onApplyCharge,
}: FuelSummaryProps) {
  if (!fuelOut || !fuelIn) return null

  const { levelsMissing, suggestedCharge } = getFuelDiscrepancy(fuelOut, fuelIn, chargePerLevel)

  if (levelsMissing <= 0) {
    return (
      <div className="md:col-span-2 mt-2">
        <div className="flex items-center gap-3 bg-emerald-500/7 border border-emerald-500/20 rounded-2xl px-5 py-3.5">
          <span>✅</span>
          <div>
            <p className="text-sm font-semibold text-white/80">Fuel returned full — no charge needed</p>
            <p className="text-xs text-white/35 mt-0.5">
              Out: {fuelOut} &nbsp;→&nbsp; In: {fuelIn}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const currentOutstanding = amountOutstanding ?? 0
  const newOutstanding = currentOutstanding + suggestedCharge

  return (
    <div className="md:col-span-2 mt-2">
      <div className="bg-yellow-500/8 border border-yellow-500/25 rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <span>⛽</span>
          <span className="text-sm font-bold text-yellow-400 uppercase tracking-wider">
            Fuel Discrepancy Detected
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Out</p>
            <div className="text-2xl">{FUEL_EMOJI[fuelOut] ?? '❓'}</div>
            <p className="text-sm font-semibold text-white mt-1">{fuelOut}</p>
          </div>
          <div className="flex items-center justify-center text-white/30 text-xl">→</div>
          <div className="text-center">
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">In</p>
            <div className="text-2xl">{FUEL_EMOJI[fuelIn] ?? '❓'}</div>
            <p className="text-sm font-semibold text-yellow-400 mt-1">{fuelIn}</p>
          </div>
        </div>
        <div className="bg-black/20 rounded-xl p-3.5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Suggested Charge</p>
            <p className="text-xl font-bold text-white mt-0.5">
              ${suggestedCharge.toFixed(2)}
            </p>
            <p className="text-[11px] text-white/35 mt-0.5">
              {levelsMissing} level{levelsMissing > 1 ? 's' : ''} × ${chargePerLevel}/level
            </p>
          </div>
          <button
            type="button"
            onClick={() => onApplyCharge(newOutstanding)}
            className="bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-400 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap"
          >
            Apply to Outstanding
          </button>
        </div>
      </div>
    </div>
  )
}
