import type { Metadata } from 'next'
import VerifyClient from './VerifyClient'

export const metadata: Metadata = {
  title: 'Verify a signed rental agreement — éPure Drive',
  description:
    'Paste the SHA-256 tamper-evidence hash from your rental agreement to confirm it matches a real signed document and has not been altered.',
  robots: { index: false, follow: false },
}

interface SearchParams {
  hash?: string
}

export default async function AgreementVerifyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const initialHash = (params.hash ?? '').toLowerCase().trim()

  return (
    <main className="min-h-screen bg-black pt-24 pb-24 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-full px-4 py-1.5 mb-5">
            <span className="text-[11px] font-bold tracking-[0.25em] text-charcoal uppercase">
              Tamper-evidence
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Verify a signed agreement
          </h1>
          <p className="text-lg text-charcoal font-light max-w-xl mx-auto">
            Paste the SHA-256 hash from a signed rental agreement. We&apos;ll
            confirm whether it matches a real signed document on éPure Drive
            and has not been altered.
          </p>
        </div>

        <VerifyClient initialHash={initialHash} />

        <div className="mt-12 text-[12px] text-charcoal/70 space-y-3 max-w-2xl mx-auto leading-relaxed font-light">
          <p>
            <strong className="text-silver">How does this work?</strong> When a
            renter signs an agreement, we compute a SHA-256 hash over the
            agreement&apos;s core fields (customer name, vehicle, dates,
            amounts), the operator&apos;s clauses, the signature image, the
            signing timestamp and the signer&apos;s IP. The hash is shown on
            the signed agreement.
          </p>
          <p>
            If anyone modifies the agreement data after signing, recomputing
            the hash will yield a different value than the one that was
            originally stored — making any tampering detectable.
          </p>
          <p>
            This page only confirms whether a hash matches an existing record.
            It never reveals the renter&apos;s personal data (license,
            address, payment details).
          </p>
        </div>
      </div>
    </main>
  )
}
