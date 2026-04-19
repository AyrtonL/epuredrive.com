'use client'

import { useEffect, useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'

interface Props {
  reservationId: number
  tenantSignedAt: string | null
  onSigned: () => void
}

export default function TenantCloseOut({ reservationId, tenantSignedAt, onSigned }: Props) {
  const sigRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState<'idle' | 'signing' | 'submitting' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [sigEmpty, setSigEmpty] = useState(true)
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    if (step !== 'signing') return
    const el = containerRef.current
    if (!el) return
    setCanvasSize({ w: Math.max(el.clientWidth, 280), h: 140 })
  }, [step])

  if (tenantSignedAt) {
    return (
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-400" />
        <span className="text-xs text-blue-300 font-bold">Closed Out</span>
        <span className="text-xs text-white/30 ml-1">
          {new Date(tenantSignedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-400" />
        <span className="text-xs text-blue-300 font-bold">Closed Out</span>
        <span className="text-xs text-emerald-400 ml-2">Signature saved & email sent to customer</span>
      </div>
    )
  }

  if (step === 'idle') {
    return (
      <button
        type="button"
        onClick={() => setStep('signing')}
        className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-3 py-1.5 rounded-lg font-bold transition-all border border-blue-500/30"
      >
        Close Out &amp; Sign
      </button>
    )
  }

  function clearSignature() {
    sigRef.current?.clear()
    setSigEmpty(true)
  }

  async function handleSubmit() {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      setError('Please draw your signature.')
      return
    }

    setError(null)
    setStep('submitting')

    const signatureDataUrl = sigRef.current.getCanvas().toDataURL('image/png')

    try {
      const res = await fetch('/api/agreement/tenant-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId, signature: signatureDataUrl }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to submit signature')
      }

      setStep('done')
      onSigned()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setStep('signing')
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-white/40">
        By signing below you confirm the final charges and close out this rental.
      </p>

      <div
        ref={containerRef}
        className="border border-blue-500/30 rounded-xl overflow-hidden bg-white"
      >
        {canvasSize && (
          <SignatureCanvas
            ref={sigRef}
            canvasProps={{
              width: canvasSize.w,
              height: canvasSize.h,
              className: 'block',
            }}
            backgroundColor="white"
            clearOnResize={false}
            onEnd={() => setSigEmpty(sigRef.current?.isEmpty?.() ?? true)}
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={clearSignature}
          className="text-xs text-white/30 hover:text-white/60 underline"
        >
          Clear
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setStep('idle'); setError(null) }}
            className="text-xs text-white/40 hover:text-white/70 px-3 py-1.5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={sigEmpty || step === 'submitting'}
            className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded-lg font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {step === 'submitting' ? 'Signing...' : 'Sign & Close Out'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
