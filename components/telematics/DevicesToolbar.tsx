'use client'

// components/telematics/DevicesToolbar.tsx
// Filter tabs + refresh button for the Devices page. Uses URL search params
// for the filter so the state survives a server-render refresh after the
// "Refresh from Bouncie" action revalidates the page.
import { useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { refreshDevicesAction } from '@/app/(dashboard)/dashboard/telematics/devices/actions'

export type DeviceFilter = 'all' | 'linked' | 'unlinked'

const TABS: { key: DeviceFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'linked', label: 'Linked' },
  { key: 'unlinked', label: 'Unlinked' },
]

export default function DevicesToolbar({ current }: { current: DeviceFilter }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  function switchTo(next: DeviceFilter) {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (next === 'all') params.delete('filter')
    else params.set('filter', next)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  function onRefresh() {
    setStatus(null)
    startTransition(async () => {
      const result = await refreshDevicesAction()
      if (result.error) {
        setStatus({ kind: 'err', text: result.error })
        return
      }
      setStatus({ kind: 'ok', text: 'Refreshed from Bouncie.' })
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => switchTo(tab.key)}
            className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full transition-colors ${
              current === tab.key
                ? 'bg-white text-black'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {status && (
          <span
            className={`text-xs ${
              status.kind === 'ok' ? 'text-emerald-300' : 'text-red-300'
            }`}
          >
            {status.text}
          </span>
        )}
        <button
          type="button"
          onClick={onRefresh}
          disabled={pending}
          className="bg-white/10 hover:bg-white/15 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
        >
          {pending ? 'Refreshing...' : 'Refresh from Bouncie'}
        </button>
      </div>
    </div>
  )
}
