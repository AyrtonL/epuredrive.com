'use client'

import { useState, useTransition, useRef } from 'react'
import { saveAgreementSettings, uploadAgreementTemplate } from './actions'
import AgreementPreviewModal from './AgreementPreviewModal'

interface Props {
  tenant: {
    name?: string | null
    brand_name?: string | null
    plan?: string | null
    logo_url?: string | null
    primary_color?: string | null
    company_address?: string | null
    company_phone?: string | null
    agreement_clauses?: string | null
    agreement_template_url?: string | null
  } | null
}

export default function AgreementSettings({ tenant }: Props) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')
  const [companyAddress, setCompanyAddress] = useState(tenant?.company_address || '')
  const [companyPhone, setCompanyPhone] = useState(tenant?.company_phone || '')
  const [clauses, setClauses] = useState(tenant?.agreement_clauses || '')
  const [templateUrl, setTemplateUrl] = useState(tenant?.agreement_template_url || '')
  const [uploading, setUploading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const isMax = tenant?.plan === 'max' || tenant?.plan === 'enterprise'

  const inputCls = 'w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm focus:ring-1 focus:ring-white/20 text-white outline-none transition-all'
  const labelCls = 'text-[11px] font-bold text-white/50 uppercase tracking-widest pl-1'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    startTransition(async () => {
      const result = await saveAgreementSettings({
        company_address: companyAddress.trim() || null,
        company_phone: companyPhone.trim() || null,
        agreement_clauses: clauses.trim() || null,
      })
      if (result.error) setMsg('Error: ' + result.error)
      else setMsg('Agreement settings saved.')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {msg && (
        <div className={`p-3 rounded-xl text-sm border ${msg.startsWith('Error') ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'}`}>
          {msg}
        </div>
      )}

      {/* Company Info */}
      <div className="glass border border-white/10 rounded-3xl p-6 space-y-5">
        <h3 className="text-white font-bold text-sm uppercase tracking-widest opacity-50">Company Information</h3>
        <p className="text-white/30 text-xs">Shown in the header of every rental agreement sent to customers.</p>

        <div className="space-y-1">
          <label className={labelCls}>Company Address</label>
          <textarea
            value={companyAddress}
            onChange={e => setCompanyAddress(e.target.value)}
            placeholder={'e.g. 123 Main St\nMiami, Florida 33101'}
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </div>

        <div className="space-y-1">
          <label className={labelCls}>Company Phone</label>
          <input
            type="text"
            value={companyPhone}
            onChange={e => setCompanyPhone(e.target.value)}
            placeholder="e.g. (786) 209-6770"
            className={inputCls}
          />
        </div>
      </div>

      {/* Custom Clauses */}
      <div className="glass border border-white/10 rounded-3xl p-6 space-y-5">
        <h3 className="text-white font-bold text-sm uppercase tracking-widest opacity-50">Additional Clauses</h3>
        <p className="text-white/30 text-xs">
          These clauses are appended after the standard terms in every agreement. Use this to add state-specific rules, mileage policies, damage deposits, etc.
        </p>
        <div className="space-y-1">
          <label className={labelCls}>Custom Terms</label>
          <textarea
            value={clauses}
            onChange={e => setClauses(e.target.value)}
            placeholder={'e.g.\n11. SECURITY DEPOSIT. A security deposit of $500 is required and will be released within 5 business days of vehicle return.\n12. MILEAGE. This rental includes 200 miles per day. Overage is billed at $0.25/mile.'}
            rows={8}
            className={`${inputCls} resize-none font-mono text-xs`}
          />
          <p className="text-[10px] text-white/20 pl-1">Plain text. Each clause on its own line or paragraph.</p>
        </div>
      </div>

      {/* Max Plan: Custom Template */}
      <div className={`glass border rounded-3xl p-6 space-y-5 ${isMax ? 'border-white/10' : 'border-white/5 opacity-60'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-widest opacity-50">Custom Agreement Template</h3>
            <p className="text-white/30 text-xs mt-1">
              Upload your own HTML agreement template. Use placeholders like <code className="text-white/50">{'{{customer_name}}'}</code>, <code className="text-white/50">{'{{car_model}}'}</code>, <code className="text-white/50">{'{{pickup_date}}'}</code>.
            </p>
          </div>
          {!isMax && (
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">Max Plan</span>
          )}
        </div>

        {isMax ? (
          <div className="space-y-3">
            {templateUrl && (
              <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <a href={templateUrl} target="_blank" rel="noopener" className="text-xs text-white/60 hover:text-white truncate flex-1">
                  {templateUrl.split('/').pop()}
                </a>
                <button type="button" onClick={() => setTemplateUrl('')} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
              </div>
            )}
            <div className="flex items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept=".html,.htm"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setUploading(true)
                  setMsg('')
                  const fd = new FormData()
                  fd.append('file', file)
                  const result = await uploadAgreementTemplate(fd)
                  if (result.url) setTemplateUrl(result.url)
                  else if (result.error) setMsg('Error: ' + result.error)
                  setUploading(false)
                  if (fileRef.current) fileRef.current.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : templateUrl ? 'Replace Template' : 'Upload HTML Template'}
              </button>
              <p className="text-[10px] text-white/20">.html file — Max 500KB</p>
            </div>

            {/* Placeholder reference */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Available Placeholders</p>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-white/40 font-mono">
                {[
                  '{{customer_name}}', '{{customer_email}}', '{{customer_phone}}',
                  '{{customer_address}}', '{{customer_zip}}',
                  '{{car_make}}', '{{car_model}}', '{{car_year}}', '{{car_vin}}',
                  '{{pickup_date}}', '{{pickup_time}}', '{{return_date}}', '{{return_time}}',
                  '{{pickup_location}}', '{{total_amount}}', '{{agreement_number}}',
                  '{{tenant_name}}', '{{tenant_address}}', '{{tenant_phone}}',
                  '{{license_number}}', '{{license_state}}', '{{license_expiration_date}}',
                  '{{insurance_provider}}', '{{insurance_policy_number}}', '{{insurance_expiration_date}}',
                ].map(p => (
                  <span key={p} className="truncate">{p}</span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-white/20 text-sm">
            Upgrade to the Max plan to upload a fully custom agreement template.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Preview
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="bg-white text-black hover:bg-white/90 px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-white/5 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
        >
          {isPending ? 'Saving...' : 'Save Agreement Settings'}
        </button>
      </div>

      <AgreementPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        tenant={{
          name: tenant?.name || null,
          brand_name: tenant?.brand_name || null,
          logo_url: tenant?.logo_url || null,
          primary_color: tenant?.primary_color || null,
          company_address: companyAddress.trim() || null,
          company_phone: companyPhone.trim() || null,
          agreement_clauses: clauses.trim() || null,
        }}
      />
    </form>
  )
}
