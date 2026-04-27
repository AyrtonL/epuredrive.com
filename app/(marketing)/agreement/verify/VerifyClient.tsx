'use client'

import { useEffect, useState } from 'react'

type Status = 'idle' | 'loading' | 'valid' | 'invalid' | 'error'

interface VerifyResult {
  valid: boolean
  hash?: string
  tenant?: string
  vehicle?: string | null
  customer?: string
  signedAt?: string | null
  countersignedAt?: string | null
  error?: string
}

const HASH_REGEX = /^[a-f0-9]{64}$/

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    })
  } catch {
    return iso
  }
}

interface Props {
  initialHash: string
}

export default function VerifyClient({ initialHash }: Props) {
  const [hash, setHash] = useState<string>(initialHash)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function runVerify(value: string) {
    const cleaned = value.trim().toLowerCase()
    if (!cleaned) {
      setStatus('error')
      setErrorMessage('Paste a hash to verify.')
      return
    }
    if (!HASH_REGEX.test(cleaned)) {
      setStatus('error')
      setErrorMessage('That doesn’t look like a SHA-256 hash (64 hex characters).')
      return
    }

    setStatus('loading')
    setErrorMessage(null)
    setResult(null)

    try {
      const res = await fetch(`/api/agreement/verify?hash=${cleaned}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      })
      const data: VerifyResult = await res.json().catch(() => ({ valid: false }))

      if (!res.ok && res.status !== 200) {
        setStatus('error')
        setErrorMessage(data.error ?? 'Verification failed. Please try again.')
        return
      }

      setResult(data)
      setStatus(data.valid ? 'valid' : 'invalid')
    } catch {
      setStatus('error')
      setErrorMessage('Network error. Please try again.')
    }
  }

  useEffect(() => {
    if (initialHash && HASH_REGEX.test(initialHash)) {
      void runVerify(initialHash)
    }
  }, [initialHash])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void runVerify(hash)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor="agreement-hash" className="block text-sm font-medium text-silver">
          Agreement hash (SHA-256)
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="agreement-hash"
            value={hash}
            onChange={(event) => setHash(event.target.value)}
            placeholder="e.g. 3f7c9a8b...d4e2"
            spellCheck={false}
            autoComplete="off"
            inputMode="text"
            className="flex-1 bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-white/25 focus:outline-none focus:border-white/30"
            aria-describedby="agreement-hash-help"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="bg-white text-black font-semibold px-6 py-3 rounded-xl text-sm hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'loading' ? 'Verifying…' : 'Verify'}
          </button>
        </div>
        <p id="agreement-hash-help" className="text-[11px] text-charcoal/70">
          The hash appears on signed agreements and is also stored in the PDF you received.
        </p>
      </form>

      {status === 'error' && errorMessage && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.06] p-5">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="text-sm font-bold text-red-300 uppercase tracking-widest mb-1">Error</div>
              <div className="text-sm text-red-200/90 leading-relaxed">{errorMessage}</div>
            </div>
          </div>
        </div>
      )}

      {status === 'invalid' && (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/[0.05] p-5">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
            </svg>
            <div>
              <div className="text-sm font-bold text-yellow-300 uppercase tracking-widest mb-1">No match</div>
              <div className="text-sm text-yellow-100/90 leading-relaxed">
                This hash does not match any signed agreement on éPure Drive.
                It may be from a different service, mistyped, or the agreement
                may have been altered after signing.
              </div>
            </div>
          </div>
        </div>
      )}

      {status === 'valid' && result?.valid && (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.04] p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="text-[11px] font-bold text-emerald-300/80 uppercase tracking-widest">
                Verified
              </div>
              <div className="text-lg font-bold text-white">
                Signed agreement on file.
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Operator</dt>
              <dd className="text-white">{result.tenant ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Vehicle</dt>
              <dd className="text-white">{result.vehicle ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Renter</dt>
              <dd className="text-white">{result.customer ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Signed</dt>
              <dd className="text-white">{fmtDate(result.signedAt)}</dd>
            </div>
            {result.countersignedAt && (
              <div className="sm:col-span-2">
                <dt className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Countersigned by operator</dt>
                <dd className="text-white">{fmtDate(result.countersignedAt)}</dd>
              </div>
            )}
          </dl>

          <div className="border-t border-white/[0.06] pt-4">
            <dt className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Hash</dt>
            <dd className="text-[11px] font-mono text-white/70 break-all leading-relaxed">{result.hash}</dd>
          </div>
        </div>
      )}
    </div>
  )
}
