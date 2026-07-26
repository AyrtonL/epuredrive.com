'use client'

import { useEffect } from 'react'
import AgreementDocument, {
  type AgreementCar,
  type AgreementReservation,
} from '@/app/(sites)/sites/[slug]/agreement/[token]/AgreementDocument'

interface PreviewTenant {
  name: string | null
  brand_name: string | null
  logo_url: string | null
  primary_color: string | null
  company_address: string | null
  company_phone: string | null
  agreement_clauses: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  tenant: PreviewTenant
}

const SAMPLE_CAR: AgreementCar = {
  make: 'Tesla',
  model: 'Model 3',
  model_full: 'Model 3 Long Range',
  year: 2025,
  vin: '5YJ3E1EA4PF000000',
  transmission: 'Automatic',
  color: 'Pearl White',
  plate: 'SAMPLE-01',
}

function buildSampleReservation(): AgreementReservation {
  const today = new Date()
  const pickup = new Date(today)
  pickup.setDate(today.getDate() + 7)
  const ret = new Date(today)
  ret.setDate(today.getDate() + 10)
  const iso = (d: Date) => d.toISOString().slice(0, 10)

  return {
    id: 1234,
    customer_name: 'Jane Smith',
    customer_email: 'jane.smith@example.com',
    customer_phone: '(786) 555-0123',
    customer_dob: '1990-05-14',
    customer_address: '456 Ocean Dr, Miami Beach, FL 33139',
    pickup_date: iso(pickup),
    pickup_time: '10:00',
    return_date: iso(ret),
    return_time: '10:00',
    pickup_location: 'Miami, FL',
    return_location: 'Miami, FL',
    total_amount: 750,
    security_deposit: 250,
    surcharge: null,
    amount_outstanding: null,
    odometer_out: 12450,
    odometer_in: null,
    fuel_out: 'Full',
    fuel_in: null,
    license_number: 'S123-456-78-900-0',
    license_state: 'FL',
    license_expiration_date: null,
    insurance_provider: null,
    insurance_policy_number: null,
    insurance_expiration_date: null,
    damage_checkin: null,
    damage_checkout: null,
    tenant_signed_at: null,
    tenant_signature_url: null,
    tenant_signed_by: null,
  }
}

export default function AgreementPreviewModal({ open, onClose, tenant }: Props) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  const tenantName = tenant.brand_name || tenant.name || 'Your Company'
  const accentColor = tenant.primary_color || '#00d2ff'
  const reservation = buildSampleReservation()

  const signatureSlot = (
    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50">
      <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">Customer signature area</p>
      <p className="text-gray-400 text-[11px] mt-1">
        In the real agreement your customer draws their signature here.
      </p>
    </div>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Preview</div>
            <h2 className="text-white font-bold text-base mt-0.5">Rental Agreement — Sample</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-widest text-amber-300 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-full">
              Sample data
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-4 sm:p-6">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <AgreementDocument
                reservation={reservation}
                tenant={tenant}
                car={SAMPLE_CAR}
                tenantName={tenantName}
                accentColor={accentColor}
                signatureSlot={signatureSlot}
              />
            </div>
            <p className="text-center text-white/30 text-[11px] mt-4 px-4">
              This preview uses sample customer and vehicle data. Your company info, clauses and branding come from your real settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
