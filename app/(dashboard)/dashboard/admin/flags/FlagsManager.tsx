'use client'

import { useTransition, useState } from 'react'
import { toggleFeatureFlag, setTenantFlagOverride, removeTenantFlagOverride } from '../actions'

interface Flag {
  key: string
  label: string
  description: string | null
  enabled: boolean
  scope: string
  updated_at: string | null
}

interface Override {
  flag_key: string
  tenant_id: string
  enabled: boolean
}

interface TenantRef {
  id: string
  name: string
}

interface Props {
  flags: Flag[]
  overrides: Override[]
  tenants: TenantRef[]
}

export default function FlagsManager({ flags, overrides, tenants }: Props) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [expandedFlag, setExpandedFlag] = useState<string | null>(null)

  // Local state for global toggles
  const [localGlobal, setLocalGlobal] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {}
    for (const f of flags) state[f.key] = f.enabled
    return state
  })

  // Local state for overrides: key = `${flagKey}:${tenantId}`
  const [localOverrides, setLocalOverrides] = useState<Record<string, boolean | null>>(() => {
    const state: Record<string, boolean | null> = {}
    for (const o of overrides) state[`${o.flag_key}:${o.tenant_id}`] = o.enabled
    return state
  })

  function handleGlobalToggle(key: string, currentEnabled: boolean) {
    const newValue = !currentEnabled
    setLocalGlobal((prev) => ({ ...prev, [key]: newValue }))
    setPendingAction(`global:${key}`)
    setMsg('')

    startTransition(async () => {
      const result = await toggleFeatureFlag(key, newValue)
      setPendingAction(null)
      if (result.error) {
        setLocalGlobal((prev) => ({ ...prev, [key]: currentEnabled }))
        setMsg(result.error)
      }
    })
  }

  function handleTenantOverride(flagKey: string, tenantId: string, enabled: boolean) {
    const overrideKey = `${flagKey}:${tenantId}`
    setLocalOverrides((prev) => ({ ...prev, [overrideKey]: enabled }))
    setPendingAction(overrideKey)
    setMsg('')

    startTransition(async () => {
      const result = await setTenantFlagOverride(flagKey, tenantId, enabled)
      setPendingAction(null)
      if (result.error) {
        // Revert
        const original = overrides.find(o => o.flag_key === flagKey && o.tenant_id === tenantId)
        setLocalOverrides((prev) => ({ ...prev, [overrideKey]: original?.enabled ?? null }))
        setMsg(result.error)
      }
    })
  }

  function handleRemoveOverride(flagKey: string, tenantId: string) {
    const overrideKey = `${flagKey}:${tenantId}`
    setLocalOverrides((prev) => ({ ...prev, [overrideKey]: null }))
    setPendingAction(overrideKey)
    setMsg('')

    startTransition(async () => {
      const result = await removeTenantFlagOverride(flagKey, tenantId)
      setPendingAction(null)
      if (result.error) {
        const original = overrides.find(o => o.flag_key === flagKey && o.tenant_id === tenantId)
        setLocalOverrides((prev) => ({ ...prev, [overrideKey]: original?.enabled ?? null }))
        setMsg(result.error)
      }
    })
  }

  function getEffectiveValue(flagKey: string, tenantId: string): { value: boolean; source: 'override' | 'global' } {
    const overrideKey = `${flagKey}:${tenantId}`
    const override = localOverrides[overrideKey]
    if (override !== null && override !== undefined) {
      return { value: override, source: 'override' }
    }
    return { value: localGlobal[flagKey] ?? false, source: 'global' }
  }

  const enabledCount = Object.values(localGlobal).filter(Boolean).length
  const overrideCount = Object.values(localOverrides).filter(v => v !== null && v !== undefined).length

  return (
    <div className="space-y-6">
      {msg && (
        <div className="p-3 rounded-xl text-sm border bg-red-500/20 text-red-300 border-red-500/30">
          {msg}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        <div className="glass border border-purple-500/10 rounded-2xl p-4 text-center">
          <div className="text-[10px] font-bold text-purple-400/40 uppercase tracking-widest mb-2">Overrides</div>
          <div className="text-2xl font-bold text-purple-400">{overrideCount}</div>
        </div>
      </div>

      {/* How it works */}
      <div className="glass border border-white/[0.06] rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <svg className="w-4 h-4 text-blue-400/60 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <p className="text-white/30 text-xs leading-relaxed">
            <strong className="text-white/50">Global toggle</strong> sets the default for all tenants.
            Click a flag row to expand <strong className="text-white/50">per-tenant overrides</strong> —
            you can enable a feature for a specific tenant even if it&apos;s off globally, or disable it for one tenant while it&apos;s on for everyone else.
          </p>
        </div>
      </div>

      {/* Flags List */}
      <div className="glass border border-white/10 rounded-3xl p-6 md:p-8">
        <div className="space-y-1">
          {flags.map((flag) => {
            const isEnabled = localGlobal[flag.key] ?? flag.enabled
            const isGlobalLoading = pendingAction === `global:${flag.key}` && isPending
            const isExpanded = expandedFlag === flag.key
            const isPerTenant = flag.scope === 'per-tenant'

            // Count active overrides for this flag
            const flagOverrides = tenants.map(t => {
              const ok = `${flag.key}:${t.id}`
              return { tenant: t, override: localOverrides[ok] }
            }).filter(x => x.override !== null && x.override !== undefined)

            return (
              <div key={flag.key} className="rounded-xl border border-transparent hover:border-white/[0.04] transition-colors">
                {/* Flag Row */}
                <div className="flex items-center justify-between p-4">
                  <button
                    onClick={() => setExpandedFlag(isExpanded ? null : flag.key)}
                    className="flex-1 text-left flex items-center gap-3"
                  >
                    <svg
                      className={`w-3 h-3 text-white/20 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-white text-sm font-medium">{flag.label}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider border ${
                          isPerTenant
                            ? 'text-purple-400/60 bg-purple-500/5 border-purple-500/10'
                            : 'text-blue-400/60 bg-blue-500/5 border-blue-500/10'
                        }`}>
                          {flag.scope}
                        </span>
                        {flagOverrides.length > 0 && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full text-purple-400/80 bg-purple-500/10 border border-purple-500/15 font-bold">
                            {flagOverrides.length} override{flagOverrides.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {isGlobalLoading && (
                          <span className="text-[9px] text-amber-400/60 animate-pulse">saving...</span>
                        )}
                      </div>
                      <div className="text-white/30 text-xs mt-1">{flag.description}</div>
                    </div>
                  </button>

                  {/* Global Toggle */}
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-[9px] text-white/20 uppercase tracking-wider font-bold">Global</span>
                    <button
                      onClick={() => handleGlobalToggle(flag.key, isEnabled)}
                      disabled={isGlobalLoading}
                      className="relative cursor-pointer disabled:cursor-wait"
                      aria-label={`Toggle ${flag.label} globally`}
                    >
                      <div className={`w-10 h-[22px] rounded-full transition-colors ${isEnabled ? 'bg-emerald-500/30' : 'bg-white/10'}`} />
                      <div className={`absolute top-[3px] left-[3px] w-[16px] h-[16px] rounded-full transition-all ${isEnabled ? 'bg-emerald-400 translate-x-[18px]' : 'bg-white/30'}`} />
                    </button>
                  </div>
                </div>

                {/* Per-Tenant Overrides (Expanded) */}
                {isExpanded && (
                  <div className="mx-4 mb-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">
                      Per-Tenant Overrides
                    </div>
                    <div className="space-y-1">
                      {tenants.map((tenant) => {
                        const { value: effective, source } = getEffectiveValue(flag.key, tenant.id)
                        const overrideKey = `${flag.key}:${tenant.id}`
                        const hasOverride = localOverrides[overrideKey] !== null && localOverrides[overrideKey] !== undefined
                        const isThisLoading = pendingAction === overrideKey && isPending

                        return (
                          <div
                            key={tenant.id}
                            className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.03] transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-white/30 text-[9px] font-bold uppercase">
                                {tenant.name[0]}
                              </div>
                              <span className="text-white/70 text-sm">{tenant.name}</span>
                              {hasOverride && (
                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400/70 font-bold uppercase tracking-wider border border-purple-500/10">
                                  Override
                                </span>
                              )}
                              {!hasOverride && (
                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-white/20 font-bold uppercase tracking-wider">
                                  Inherits Global
                                </span>
                              )}
                              {isThisLoading && (
                                <span className="text-[9px] text-amber-400/60 animate-pulse">saving...</span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Effective status indicator */}
                              <span className={`text-[9px] font-bold uppercase tracking-wider ${effective ? 'text-emerald-400/60' : 'text-white/20'}`}>
                                {effective ? 'On' : 'Off'}
                              </span>

                              {/* Override toggle */}
                              <button
                                onClick={() => handleTenantOverride(flag.key, tenant.id, !effective)}
                                disabled={isThisLoading}
                                className="relative cursor-pointer disabled:cursor-wait"
                                aria-label={`Toggle ${flag.label} for ${tenant.name}`}
                              >
                                <div className={`w-8 h-[18px] rounded-full transition-colors ${effective ? 'bg-emerald-500/30' : 'bg-white/10'}`} />
                                <div className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full transition-all ${effective ? 'bg-emerald-400 translate-x-[14px]' : 'bg-white/30'}`} />
                              </button>

                              {/* Remove override button */}
                              {hasOverride && (
                                <button
                                  onClick={() => handleRemoveOverride(flag.key, tenant.id)}
                                  disabled={isThisLoading}
                                  className="text-white/20 hover:text-red-400 transition-colors p-1"
                                  title="Remove override (fall back to global)"
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
