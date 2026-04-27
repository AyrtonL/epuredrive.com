'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import SignatureCanvas from 'react-signature-canvas'
import AgreementDocument, {
  type AgreementCar,
  type AgreementReservation,
} from './AgreementDocument'

interface Tenant {
  id: string
  name: string
  brand_name: string | null
  slug: string
  logo_url: string | null
  primary_color: string | null
  company_address: string | null
  company_phone: string | null
  agreement_clauses: string | null
  agreement_template_url: string | null
  plan: string | null
}

interface Reservation extends AgreementReservation {
  agreement_signed_at: string | null
  agreement_signature_url: string | null
  agreement_document_hash?: string | null
}

interface Props {
  reservation: Reservation
  tenant: Tenant
  car: AgreementCar | null
  tenantName: string
  carName: string
  accentColor: string
  token: string
}

export default function AgreementSigner({
  reservation,
  tenant,
  car,
  tenantName,
  accentColor,
  token,
}: Props) {
  const sigRef = useRef<any>(null)
  const agreementRef = useRef<HTMLDivElement>(null)
  const sigContainerRef = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState<'view' | 'sign' | 'submitting' | 'done'>('view')
  const [error, setError] = useState<string | null>(null)
  const [sigEmpty, setSigEmpty] = useState(true)
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    if (step !== 'sign') return
    const el = sigContainerRef.current
    if (!el) return
    setCanvasSize({ w: Math.max(el.clientWidth, 300), h: 160 })
  }, [step])

  const alreadySigned = !!reservation.agreement_signed_at

  function clearSignature() {
    sigRef.current?.clear()
    setSigEmpty(true)
  }

  async function handleSubmit() {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      setError('Please draw your signature before submitting.')
      return
    }

    setError(null)
    setStep('submitting')

    const signatureDataUrl = sigRef.current.getCanvas().toDataURL('image/png')

    try {
      // 1. Submit signature to server — saves to Supabase, sends emails
      const res = await fetch('/api/agreement/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, signature: signatureDataUrl }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to submit agreement')
      }

      // 2. Generate PDF client-side and upload — best-effort, non-blocking
      void generateAndUploadPDF(signatureDataUrl)

      setStep('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStep('sign')
    }
  }

  async function generateAndUploadPDF(signatureDataUrl: string) {
    const element = agreementRef.current
    if (!element) return

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.92)
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const imgH = (canvas.height * pageW) / canvas.width
      let y = 0
      let remaining = imgH

      while (remaining > 0) {
        pdf.addImage(imgData, 'JPEG', 0, -y, pageW, imgH)
        remaining -= pageH
        if (remaining > 0) {
          pdf.addPage()
          y += pageH
        }
      }

      const pdfBlob = pdf.output('blob')
      const formData = new FormData()
      formData.append('pdf', pdfBlob, `agreement-${reservation.id}.pdf`)
      formData.append('token', token)

      await fetch('/api/agreement/upload-pdf', {
        method: 'POST',
        body: formData,
      })
    } catch {
      // PDF generation is best-effort — signing already succeeded
      console.warn('PDF generation failed, agreement is still signed')
    }
  }

  if (alreadySigned) {
    const customerSignatureSlot = (
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>
            Signed by <strong>{reservation.customer_name || 'Renter'}</strong> on{' '}
            {new Date(reservation.agreement_signed_at!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
        {reservation.agreement_signature_url && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={reservation.agreement_signature_url}
            alt="Renter signature"
            className="h-16 object-contain"
          />
        )}
        {reservation.agreement_document_hash && (
          <div className="border-t border-gray-100 pt-3 mt-3 text-[10px] text-gray-400 space-y-1.5">
            <div className="font-bold uppercase tracking-widest text-gray-500">
              Tamper-evidence
            </div>
            <div className="font-mono break-all leading-snug">
              SHA-256: {reservation.agreement_document_hash}
            </div>
            <div className="text-gray-400">
              This hash was computed at signing time from the agreement content,
              signature, timestamp and IP. Any later change to the agreement
              data produces a different hash.{' '}
              <a
                href={`https://epuredrive.com/agreement/verify?hash=${reservation.agreement_document_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 text-gray-500 hover:text-gray-700"
              >
                Verify this hash →
              </a>
            </div>
          </div>
        )}
      </div>
    )

    return (
      <div className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Banner */}
          <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 border-l-4" style={{ borderColor: accentColor }}>
            {tenant.logo_url && (
              <Image src={tenant.logo_url} alt={tenantName} width={100} height={40} className="h-10 w-auto object-contain" />
            )}
            <div>
              <h1 className="font-bold text-gray-900">{tenantName} — Rental Agreement</h1>
              <p className="text-xs text-green-600 font-semibold">
                {reservation.tenant_signed_at ? 'Finalized — Both parties have signed' : 'Signed — Pending operator close-out'}
              </p>
            </div>
          </div>

          {/* Full Agreement Document */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <AgreementDocument
              reservation={reservation}
              tenant={tenant}
              car={car}
              tenantName={tenantName}
              accentColor={accentColor}
              signatureSlot={customerSignatureSlot}
            />
          </div>
        </div>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Agreement Signed!</h1>
          <p className="text-gray-500 text-sm mb-4">
            Your rental agreement has been signed successfully. A copy has been sent to{' '}
            <strong>{reservation.customer_email || 'your email'}</strong>.
          </p>
          <p className="text-gray-400 text-xs">
            Thank you for choosing {tenantName}.
          </p>
        </div>
      </div>
    )
  }

  const signatureSlot = step === 'view' ? (
    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
      <p className="text-gray-500 text-sm mb-4">
        By signing below, you confirm that you have read, understood, and agree to all terms and conditions above.
      </p>
      <button
        onClick={() => setStep('sign')}
        className="px-8 py-3 rounded-xl font-bold text-sm text-black transition-all hover:opacity-90 active:scale-95"
        style={{ background: accentColor }}
      >
        Proceed to Sign
      </button>
    </div>
  ) : (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Draw your signature in the box below. By signing you agree to all terms above.
      </p>
      <div
        ref={sigContainerRef}
        className="border-2 rounded-xl overflow-hidden bg-white"
        style={{ borderColor: accentColor }}
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
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">
          {reservation.customer_name} — {new Date().toLocaleDateString('en-US')}
        </span>
        <button
          type="button"
          onClick={clearSignature}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Clear
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Banner ── */}
        <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 border-l-4" style={{ borderColor: accentColor }}>
          {tenant.logo_url && (
            <Image src={tenant.logo_url} alt={tenantName} width={100} height={40} className="h-10 w-auto object-contain" />
          )}
          <div>
            <h1 className="font-bold text-gray-900">{tenantName} — Rental Agreement</h1>
            <p className="text-xs text-gray-500">
              Please review the agreement carefully and sign at the bottom.
            </p>
          </div>
        </div>

        {/* ── Agreement Document ── */}
        <div ref={agreementRef} className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <AgreementDocument
            reservation={reservation}
            tenant={tenant}
            car={car}
            tenantName={tenantName}
            accentColor={accentColor}
            signatureSlot={signatureSlot}
          />
        </div>

        {/* ── Action Bar ── */}
        {step === 'sign' && (
          <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between gap-4">
            {error && (
              <p className="text-red-500 text-sm flex-1">{error}</p>
            )}
            {!error && (
              <p className="text-xs text-gray-400 flex-1">
                Your signed agreement will be emailed to {reservation.customer_email || 'you'}.
              </p>
            )}
            <button
              onClick={handleSubmit}
              disabled={sigEmpty}
              className="px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest text-black transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: accentColor }}
            >
              Sign &amp; Submit
            </button>
          </div>
        )}

        {step === 'submitting' && (
          <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-center gap-3">
            <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
            <span className="text-sm text-gray-600">Signing your agreement and generating PDF...</span>
          </div>
        )}

      </div>
    </div>
  )
}
