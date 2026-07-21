'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'

interface PaymentProcessorToggleProps {
  current: string
  stripeConnected: boolean
  squareConnected: boolean
}

export default function PaymentProcessorToggle({ current, stripeConnected, squareConnected }: PaymentProcessorToggleProps) {
  const toast = useToast()
  const [processor, setProcessor] = useState(current)
  const [saving, setSaving] = useState(false)

  async function handleChange(value: string) {
    if (value === processor) return
    if (value === 'stripe' && !stripeConnected) return
    if (value === 'square' && !squareConnected) return

    setSaving(true)
    try {
      const res = await fetch('/api/square/set-processor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processor: value }),
      })
      if (res.ok) {
        setProcessor(value)
        toast.success(`${value === 'stripe' ? 'Stripe' : 'Square'} is now your active processor.`)
      } else {
        toast.error('Could not switch payment processor. Please try again.')
      }
    } catch {
      toast.error('Could not switch payment processor. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
        Active Payment Processor
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => handleChange('stripe')}
          disabled={saving || !stripeConnected}
          className={`flex-1 p-4 rounded-2xl border text-center transition-all ${
            processor === 'stripe'
              ? 'border-[#635BFF]/40 bg-[#635BFF]/10 text-white'
              : 'border-white/[0.06] bg-white/[0.02] text-white/40 hover:border-white/10'
          } ${!stripeConnected ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          <div className="text-sm font-bold">Stripe</div>
          <div className="text-[10px] mt-1 opacity-60">
            {stripeConnected ? 'Connected' : 'Not connected'}
          </div>
          {processor === 'stripe' && (
            <div className="mt-2 text-[10px] font-bold text-[#635BFF] uppercase tracking-widest">Active</div>
          )}
        </button>

        <button
          onClick={() => handleChange('square')}
          disabled={saving || !squareConnected}
          className={`flex-1 p-4 rounded-2xl border text-center transition-all ${
            processor === 'square'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-white'
              : 'border-white/[0.06] bg-white/[0.02] text-white/40 hover:border-white/10'
          } ${!squareConnected ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          <div className="text-sm font-bold">Square</div>
          <div className="text-[10px] mt-1 opacity-60">
            {squareConnected ? 'Connected' : 'Not connected'}
          </div>
          {processor === 'square' && (
            <div className="mt-2 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Active</div>
          )}
        </button>
      </div>
      {saving && <div className="text-[10px] text-white/30 text-center">Updating...</div>}
    </div>
  )
}
