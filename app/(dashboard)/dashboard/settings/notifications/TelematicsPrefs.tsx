'use client'

import { useEffect, useState, useTransition } from 'react'
import { getTelematicsPrefs, setTelematicsWarningEmail } from './telematics-actions'

export default function TelematicsPrefs() {
  const [warningEmail, setWarningEmail] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getTelematicsPrefs()
      .then((p) => setWarningEmail(p.warningEmail))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function toggle() {
    const next = !warningEmail
    setWarningEmail(next)
    setSaved(false)
    startTransition(async () => {
      const result = await setTelematicsWarningEmail(next)
      if (result.error) {
        // Revert the optimistic toggle on failure.
        setWarningEmail(!next)
      } else {
        setSaved(true)
      }
    })
  }

  return (
    <div className="glass border border-white/10 rounded-3xl p-8">
      <h3 className="text-white font-bold mb-2">Telematics</h3>
      <p className="text-white/30 text-xs mb-6">
        Critical telematics alerts always email. Opt in below to also receive warning-level alerts.
      </p>
      <label
        className="flex items-center justify-between p-4 rounded-xl hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/[0.04] cursor-pointer"
      >
        <div className="flex-1">
          <div className="text-white text-sm font-medium">
            Email me for warning-level telematics alerts
          </div>
          <div className="text-white/30 text-xs mt-0.5">
            Covers speeding, diagnostic codes, low battery, and offline devices.
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saved && !isPending && (
            <span className="text-emerald-400 text-[10px] font-medium">Saved</span>
          )}
          <div className="relative">
            <input
              type="checkbox"
              checked={warningEmail}
              disabled={loading || isPending}
              onChange={toggle}
              className="peer sr-only"
            />
            <div className="w-10 h-[22px] rounded-full bg-white/10 peer-checked:bg-emerald-500/30 transition-colors" />
            <div className="absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white/30 peer-checked:bg-emerald-400 peer-checked:translate-x-[18px] transition-all" />
          </div>
        </div>
      </label>
    </div>
  )
}
