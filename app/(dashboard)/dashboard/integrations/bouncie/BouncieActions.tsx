'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { syncNowAction, disconnectAction } from './actions'

export default function BouncieActions() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [statusMsg, setStatusMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false)

  function onSync() {
    setStatusMsg(null)
    startTransition(async () => {
      const result = await syncNowAction()
      if (result.error) {
        setStatusMsg({ kind: 'err', text: result.error })
        return
      }
      setStatusMsg({ kind: 'ok', text: 'Sync complete.' })
      router.refresh()
    })
  }

  function onDisconnect() {
    setStatusMsg(null)
    startTransition(async () => {
      const result = await disconnectAction()
      if (result.error) {
        setStatusMsg({ kind: 'err', text: result.error })
        return
      }
      setConfirmingDisconnect(false)
      setStatusMsg({ kind: 'ok', text: 'Disconnected.' })
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSync}
          disabled={isPending}
          className="bg-white/10 hover:bg-white/15 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
        >
          {isPending ? 'Syncing...' : 'Sync now'}
        </button>
        {!confirmingDisconnect ? (
          <button
            type="button"
            onClick={() => setConfirmingDisconnect(true)}
            disabled={isPending}
            className="bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-red-200 text-xs font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
          >
            Disconnect
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60">Are you sure?</span>
            <button
              type="button"
              onClick={onDisconnect}
              disabled={isPending}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-bold px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
            >
              Confirm disconnect
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDisconnect(false)}
              disabled={isPending}
              className="text-white/40 hover:text-white/70 text-xs px-2 py-2"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      {statusMsg && (
        <p
          className={`text-xs ${
            statusMsg.kind === 'ok' ? 'text-emerald-300' : 'text-red-300'
          }`}
        >
          {statusMsg.text}
        </p>
      )}
    </div>
  )
}
