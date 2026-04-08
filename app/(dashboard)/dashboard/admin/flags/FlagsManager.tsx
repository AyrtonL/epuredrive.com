'use client'

import { useTransition, useState } from 'react'
import { toggleFeatureFlag } from '../actions'

interface Flag {
  key: string
  label: string
  description: string | null
  enabled: boolean
  scope: string
  updated_at: string | null
}

interface Props {
  flags: Flag[]
}

export default function FlagsManager({ flags }: Props) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  // Track optimistic state locally
  const [localState, setLocalState] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {}
    for (const f of flags) state[f.key] = f.enabled
    return state
  })

  function handleToggle(key: string, currentEnabled: boolean) {
    const newValue = !currentEnabled
    setLocalState((prev) => ({ ...prev, [key]: newValue }))
    setPendingKey(key)
    setMsg('')

    startTransition(async () => {
      const result = await toggleFeatureFlag(key, newValue)
      setPendingKey(null)
      if (result.error) {
        // Revert on error
        setLocalState((prev) => ({ ...prev, [key]: currentEnabled }))
        setMsg(result.error)
      }
    })
  }

  const enabledCount = Object.values(localState).filter(Boolean).length

  return (
    <div className="space-y-6">
      {msg && (
        <div className="p-3 rounded-xl text-sm border bg-red-500/20 text-red-300 border-red-500/30">
          {msg}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass border border-amber-500/10 rounded-2xl p-4 text-center">
          <div className="text-[10px] font-bold text-amber-400/40 uppercase tracking-widest mb-2">Total Flags</div>
          <div className="text-2xl font-bold text-white">{flags.length}</div>
        </div>
        <div className="glass border border-emerald-500/10 rounded-2xl p-4 text-center">
          <div className="text-[10px] font-bold text-emerald-400/40 uppercase tracking-widest mb-2">Enabled</div>
          <div className="text-2xl font-bold text-emerald-400">{enabledCount}</div>
        </div>
        <div className="glass border border-white/[0.06] rounded-2xl p-4 text-center">
          <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Disabled</div>
          <div className="text-2xl font-bold text-white/40">{flags.length - enabledCount}</div>
        </div>
      </div>

      {/* Flags List */}
      <div className="glass border border-white/10 rounded-3xl p-8">
        <div className="space-y-1">
          {flags.map((flag) => {
            const isEnabled = localState[flag.key] ?? flag.enabled
            const isLoading = pendingKey === flag.key && isPending

            return (
              <div
                key={flag.key}
                className="flex items-center justify-between p-4 rounded-xl hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/[0.04]"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-white text-sm font-medium">{flag.label}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider border ${
                      flag.scope === 'global'
                        ? 'text-blue-400/60 bg-blue-500/5 border-blue-500/10'
                        : 'text-purple-400/60 bg-purple-500/5 border-purple-500/10'
                    }`}>
                      {flag.scope}
                    </span>
                    {isLoading && (
                      <span className="text-[9px] text-amber-400/60 animate-pulse">saving...</span>
                    )}
                  </div>
                  <div className="text-white/30 text-xs mt-1">{flag.description}</div>
                </div>
                <button
                  onClick={() => handleToggle(flag.key, isEnabled)}
                  disabled={isLoading}
                  className="relative cursor-pointer disabled:cursor-wait"
                  aria-label={`Toggle ${flag.label}`}
                >
                  <div className={`w-10 h-[22px] rounded-full transition-colors ${isEnabled ? 'bg-emerald-500/30' : 'bg-white/10'}`} />
                  <div className={`absolute top-[3px] left-[3px] w-[16px] h-[16px] rounded-full transition-all ${isEnabled ? 'bg-emerald-400 translate-x-[18px]' : 'bg-white/30'}`} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
