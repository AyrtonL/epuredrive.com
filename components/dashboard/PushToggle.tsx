'use client'

import { useCallback, useEffect, useState } from 'react'

type State =
  | 'loading'
  | 'unsupported'      // no Push API (old browser)
  | 'ios-install'      // iPhone/iPad Safari: push only works from the Home Screen app
  | 'denied'           // user blocked notifications for this site
  | 'off'
  | 'on'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  return (await navigator.serviceWorker.getRegistration()) ?? navigator.serviceWorker.register('/sw.js')
}

/**
 * "Notifications on this device" switch. Opt-in is per device: each phone or
 * computer that turns it on gets new bookings, late returns, expiring
 * documents and maintenance alerts as push notifications.
 */
export default function PushToggle() {
  const [state, setState] = useState<State>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
      if (!supported) {
        setState(isIos() && !isStandalone() ? 'ios-install' : 'unsupported')
        return
      }
      if (Notification.permission === 'denied') return setState('denied')
      try {
        const reg = await getRegistration()
        const sub = await reg.pushManager.getSubscription()
        setState(sub ? 'on' : 'off')
      } catch {
        setState('off')
      }
    })()
  }, [])

  const enable = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      if (!VAPID_PUBLIC_KEY) throw new Error('Push is not configured yet. Try again after the next deploy.')
      // Must run from the tap itself — iOS rejects permission prompts otherwise.
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off')
        return
      }
      const reg = await getRegistration()
      await navigator.serviceWorker.ready
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        }))
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), test: true }),
      })
      if (!res.ok) throw new Error('Could not save this device. Please try again.')
      setState('on')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }, [])

  const disable = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const reg = await getRegistration()
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {})
        await sub.unsubscribe()
      }
      setState('off')
    } finally {
      setBusy(false)
    }
  }, [])

  return (
    <section className="glass border border-white/10 rounded-2xl md:rounded-3xl p-5 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-white font-bold">Push notifications on this device</h3>
          <p className="text-white/50 text-sm mt-1 max-w-xl">
            New bookings, late returns, customer documents expiring during a rental, and maintenance due.
            Turn it on separately on each phone or computer.
          </p>
        </div>
        {(state === 'on' || state === 'off') && (
          <button
            type="button"
            onClick={state === 'on' ? disable : enable}
            disabled={busy}
            role="switch"
            aria-checked={state === 'on'}
            className={`shrink-0 px-5 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
              state === 'on' ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-white text-black hover:bg-white/90'
            }`}
          >
            {busy ? 'One moment…' : state === 'on' ? 'Turn off' : 'Turn on'}
          </button>
        )}
      </div>

      {state === 'on' && (
        <p className="mt-4 text-sm text-emerald-400">On for this device. A test notification was sent when you turned it on.</p>
      )}
      {state === 'ios-install' && (
        <div className="mt-4 text-sm text-white/70 rounded-xl bg-white/[0.04] border border-white/10 p-4">
          On iPhone, notifications work from the installed app: in Safari tap <b>Share</b> →{' '}
          <b>Add to Home Screen</b>, open éPure Drive from your Home Screen, and come back here.
        </div>
      )}
      {state === 'denied' && (
        <p className="mt-4 text-sm text-amber-400">
          Notifications are blocked for this site. Allow them in your browser or phone settings, then reload this page.
        </p>
      )}
      {state === 'unsupported' && (
        <p className="mt-4 text-sm text-white/50">This browser doesn&apos;t support push notifications.</p>
      )}
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </section>
  )
}
