'use client'

import { useRef, useState } from 'react'
import dynamic from 'next/dynamic'

const SignatureCanvas = dynamic(() => import('react-signature-canvas'), { ssr: false }) as any

interface Car {
  make: string
  model: string
  model_full: string | null
  year: number | null
  vin: string | null
  transmission: string | null
  color: string | null
  plate: string | null
}

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

interface Reservation {
  id: number
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  customer_dob: string | null
  customer_address: string | null
  pickup_date: string | null
  pickup_time: string | null
  return_date: string | null
  return_time: string | null
  pickup_location: string | null
  return_location: string | null
  total_amount: number | null
  security_deposit: number | null
  surcharge: number | null
  amount_outstanding: number | null
  odometer_out: number | null
  odometer_in: number | null
  fuel_out: string | null
  fuel_in: string | null
  license_number: string | null
  license_state: string | null
  insurance_provider: string | null
  insurance_policy_number: string | null
  damage_checkin: string | null
  damage_checkout: string | null
  agreement_signed_at: string | null
}

interface Props {
  reservation: Reservation
  tenant: Tenant
  car: Car | null
  tenantName: string
  carName: string
  accentColor: string
  token: string
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

function formatDateTime(dateStr: string | null, timeStr: string | null): string {
  if (!dateStr) return '—'
  const date = formatDate(dateStr)
  if (!timeStr) return date
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${date} — ${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

export default function AgreementSigner({
  reservation,
  tenant,
  car,
  tenantName,
  carName,
  accentColor,
  token,
}: Props) {
  const sigRef = useRef<any>(null)
  const agreementRef = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState<'view' | 'sign' | 'submitting' | 'done'>('view')
  const [error, setError] = useState<string | null>(null)
  const [sigEmpty, setSigEmpty] = useState(true)

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

    const signatureDataUrl = sigRef.current.getTrimmedCanvas().toDataURL('image/png')

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

      // 2. Generate PDF client-side and upload
      await generateAndUploadPDF(signatureDataUrl)

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
      // Dynamically import to avoid SSR issues
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Agreement Already Signed</h1>
          <p className="text-gray-500 text-sm">
            This rental agreement was signed on{' '}
            <strong>{new Date(reservation.agreement_signed_at!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>.
          </p>
          <p className="text-gray-400 text-xs mt-4">
            Please contact {tenantName} if you have questions.
          </p>
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

  const days =
    reservation.pickup_date && reservation.return_date
      ? Math.ceil(
          (new Date(reservation.return_date).getTime() - new Date(reservation.pickup_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Banner ── */}
        <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 border-l-4" style={{ borderColor: accentColor }}>
          {tenant.logo_url && (
            <img src={tenant.logo_url} alt={tenantName} className="h-10 object-contain" />
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
          {/* Header */}
          <div className="p-8 border-b-4" style={{ borderColor: accentColor }}>
            <div className="flex justify-between items-start">
              <div>
                {tenant.logo_url && (
                  <img src={tenant.logo_url} alt={tenantName} className="h-14 object-contain mb-3" />
                )}
                <div className="font-black text-xl text-gray-900 tracking-wide">{tenantName}</div>
                {tenant.company_address && (
                  <div className="text-xs text-gray-500 mt-1 whitespace-pre-line">{tenant.company_address}</div>
                )}
                {tenant.company_phone && (
                  <div className="text-xs text-gray-500">{tenant.company_phone}</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-2xl font-black uppercase tracking-widest text-gray-900">Rental Agreement</div>
                <div className="text-xs text-gray-500 mt-2 space-y-1">
                  <div>Agreement #: <strong>RA-{reservation.id.toString().padStart(4, '0')}</strong></div>
                  <div>Date: <strong>{new Date().toLocaleDateString('en-US')}</strong></div>
                  {days && <div>Period: <strong>{days} day{days !== 1 ? 's' : ''}</strong></div>}
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6 text-sm text-gray-800">

            {/* Reservation Summary */}
            <section>
              <div className="text-[11px] font-black uppercase tracking-widest text-white px-3 py-1.5 rounded mb-3" style={{ background: '#111' }}>
                Reservation Summary
              </div>
              <table className="w-full border-collapse text-sm">
                <tbody>
                  <tr>
                    <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2 w-1/4 whitespace-nowrap">Pickup Location</td>
                    <td className="border border-gray-200 px-3 py-2">{reservation.pickup_location || '—'}</td>
                    <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2 w-1/4">Return Location</td>
                    <td className="border border-gray-200 px-3 py-2">{reservation.return_location || reservation.pickup_location || '—'}</td>
                  </tr>
                  <tr>
                    <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Date &amp; Time Out</td>
                    <td className="border border-gray-200 px-3 py-2">{formatDateTime(reservation.pickup_date, reservation.pickup_time)}</td>
                    <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Date &amp; Time Due</td>
                    <td className="border border-gray-200 px-3 py-2">{formatDateTime(reservation.return_date, reservation.return_time)}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* Vehicle Information */}
            {car && (
              <section>
                <div className="text-[11px] font-black uppercase tracking-widest text-white px-3 py-1.5 rounded mb-3" style={{ background: '#111' }}>
                  Vehicle Information
                </div>
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    <tr>
                      <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2 w-1/4">Brand &amp; Model</td>
                      <td className="border border-gray-200 px-3 py-2">{car.make} {car.model_full || car.model}</td>
                      <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2 w-1/4">Year</td>
                      <td className="border border-gray-200 px-3 py-2">{car.year || '—'}</td>
                    </tr>
                    <tr>
                      <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Color</td>
                      <td className="border border-gray-200 px-3 py-2">{car.color || '—'}</td>
                      <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Plate</td>
                      <td className="border border-gray-200 px-3 py-2">{car.plate || '—'}</td>
                    </tr>
                    <tr>
                      <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">VIN Number</td>
                      <td className="border border-gray-200 px-3 py-2 font-mono text-xs">{car.vin || '—'}</td>
                      <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Transmission</td>
                      <td className="border border-gray-200 px-3 py-2">{car.transmission || '—'}</td>
                    </tr>
                    <tr>
                      <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Odometer Out</td>
                      <td className="border border-gray-200 px-3 py-2">{reservation.odometer_out != null ? reservation.odometer_out.toLocaleString() : '—'}</td>
                      <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Odometer In</td>
                      <td className="border border-gray-200 px-3 py-2">{reservation.odometer_in != null ? reservation.odometer_in.toLocaleString() : '—'}</td>
                    </tr>
                    <tr>
                      <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Fuel Out</td>
                      <td className="border border-gray-200 px-3 py-2">{reservation.fuel_out || '—'}</td>
                      <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Fuel In</td>
                      <td className="border border-gray-200 px-3 py-2">{reservation.fuel_in || '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </section>
            )}

            {/* Renter Information */}
            <section>
              <div className="text-[11px] font-black uppercase tracking-widest text-white px-3 py-1.5 rounded mb-3" style={{ background: '#111' }}>
                Renter Information
              </div>
              <table className="w-full border-collapse text-sm">
                <tbody>
                  <tr>
                    <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2 w-1/4">Full Name</td>
                    <td className="border border-gray-200 px-3 py-2">{reservation.customer_name || '—'}</td>
                    <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2 w-1/4">Phone</td>
                    <td className="border border-gray-200 px-3 py-2">{reservation.customer_phone || '—'}</td>
                  </tr>
                  <tr>
                    <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Email</td>
                    <td className="border border-gray-200 px-3 py-2">{reservation.customer_email || '—'}</td>
                    <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Date of Birth</td>
                    <td className="border border-gray-200 px-3 py-2">{reservation.customer_dob ? formatDate(reservation.customer_dob) : '—'}</td>
                  </tr>
                  <tr>
                    <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">License #</td>
                    <td className="border border-gray-200 px-3 py-2">
                      {reservation.license_number || '—'}
                      {reservation.license_state && ` (${reservation.license_state})`}
                    </td>
                    <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Address</td>
                    <td className="border border-gray-200 px-3 py-2">{reservation.customer_address || '—'}</td>
                  </tr>
                  {(reservation.insurance_provider || reservation.insurance_policy_number) && (
                    <tr>
                      <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2">Insurance</td>
                      <td colSpan={3} className="border border-gray-200 px-3 py-2">
                        {reservation.insurance_provider}
                        {reservation.insurance_policy_number && ` — Policy: ${reservation.insurance_policy_number}`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            {/* Charges */}
            {reservation.total_amount && (
              <section>
                <div className="text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded mb-3 text-black" style={{ background: accentColor }}>
                  Charge Information
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-1">
                  <div className="flex justify-between py-1.5 border-b border-gray-200">
                    <span className="text-gray-600">Rental ({days || '?'} day{days !== 1 ? 's' : ''})</span>
                    <span className="font-medium">${reservation.total_amount.toLocaleString()}</span>
                  </div>
                  {reservation.surcharge != null && (
                    <div className="flex justify-between py-1.5 border-b border-gray-200">
                      <span className="text-gray-600">Surcharge</span>
                      <span className="font-medium">${reservation.surcharge.toLocaleString()}</span>
                    </div>
                  )}
                  {reservation.security_deposit != null && (
                    <div className="flex justify-between py-1.5 border-b border-gray-200">
                      <span className="text-gray-600">Security Deposit</span>
                      <span className="font-medium">${reservation.security_deposit.toLocaleString()}</span>
                    </div>
                  )}
                  {reservation.amount_outstanding != null && (
                    <div className="flex justify-between py-1.5 border-b border-gray-200">
                      <span className="text-gray-600">Amount Outstanding</span>
                      <span className="font-medium">${reservation.amount_outstanding.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 font-black text-base border-t-2 border-gray-800 mt-1">
                    <span>TOTAL</span>
                    <span style={{ color: accentColor }}>${reservation.total_amount.toLocaleString()}</span>
                  </div>
                </div>
              </section>
            )}

            {/* Damage Report */}
            <section>
              <div className="text-[11px] font-black uppercase tracking-widest text-white px-3 py-1.5 rounded mb-3" style={{ background: '#111' }}>
                Damage Report
              </div>
              <table className="w-full border-collapse text-sm">
                <tbody>
                  <tr>
                    <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2 w-1/4 align-top">Check-In</td>
                    <td className="border border-gray-200 px-3 py-2 min-h-[60px] whitespace-pre-line">
                      {reservation.damage_checkin || <span className="text-gray-400 italic">No damage noted at check-in</span>}
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-gray-50 font-bold border border-gray-200 px-3 py-2 align-top">Check-Out</td>
                    <td className="border border-gray-200 px-3 py-2 min-h-[60px] whitespace-pre-line">
                      {reservation.damage_checkout || <span className="text-gray-400 italic">To be completed at return</span>}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* Terms & Conditions */}
            <section>
              <div className="text-[11px] font-black uppercase tracking-widest text-white px-3 py-1.5 rounded mb-3" style={{ background: '#111' }}>
                Terms &amp; Conditions
              </div>
              <div className="text-[11px] text-gray-600 leading-relaxed space-y-2 border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-60 overflow-y-auto">
                <p><strong>1. RENTER ELIGIBILITY.</strong> Renter must be 21 years of age or older, possess a valid driver&apos;s license, and have a clean driving record. A credit or debit card is required for deposit.</p>
                <p><strong>2. VEHICLE USE.</strong> The vehicle may only be used on paved roads within the United States. Off-road use, racing, or any illegal activity is strictly prohibited. Smoking in the vehicle is not permitted.</p>
                <p><strong>3. FUEL POLICY.</strong> The vehicle will be returned with the same fuel level as at pickup. A refueling fee of $10 plus the cost of fuel will be charged if the vehicle is returned with less fuel.</p>
                <p><strong>4. MILEAGE.</strong> If a mileage limit is specified, overages will be charged at the rate stated above per mile. Unlimited mileage agreements are subject to fair use within the rental period.</p>
                <p><strong>5. DAMAGE &amp; LIABILITY.</strong> Renter is responsible for any damage to the vehicle during the rental period including collision, vandalism, and theft. Renter&apos;s personal auto insurance or credit card coverage may apply.</p>
                <p><strong>6. LATE RETURN.</strong> Vehicles returned more than 2 hours late will be charged an additional day&apos;s rental rate.</p>
                <p><strong>7. CANCELLATION.</strong> Cancellations made more than 48 hours in advance are fully refundable. Cancellations within 48 hours may be subject to a one-day charge.</p>
                <p><strong>8. TRAFFIC VIOLATIONS & TOLLS.</strong> Renter is responsible for all traffic citations, parking tickets, and toll charges incurred during the rental period. An administrative fee of $35 may be assessed per citation.</p>
                <p><strong>9. BREAKDOWN.</strong> In the event of a mechanical breakdown, renter must contact the company immediately. Unauthorized repairs will not be reimbursed.</p>
                <p><strong>10. GOVERNING LAW.</strong> This agreement shall be governed by the laws of the State of Florida.</p>
                {tenant.agreement_clauses && (
                  <div className="pt-2 border-t border-gray-200 whitespace-pre-line">
                    {tenant.agreement_clauses}
                  </div>
                )}
              </div>
            </section>

            {/* Signature Section */}
            <section>
              <div className="text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded mb-3 text-black" style={{ background: accentColor }}>
                Signature
              </div>

              {step === 'view' ? (
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
                  <div className="border-2 rounded-xl overflow-hidden bg-white" style={{ borderColor: accentColor }}>
                    <SignatureCanvas
                      ref={sigRef}
                      canvasProps={{ className: 'w-full block', height: 160 }}
                      backgroundColor="white"
                      clearOnResize={false}
                      onEnd={() => setSigEmpty(sigRef.current?.isEmpty?.() ?? true)}
                    />
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
              )}
            </section>

          </div>
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
