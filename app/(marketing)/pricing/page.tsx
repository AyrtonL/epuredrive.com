import type { Metadata } from 'next'
import Link from 'next/link'
import ArticleShell, { articleMetadata } from '@/components/marketing/ArticleShell'
import { isFreeLaunchMode } from '@/lib/plan/effective-plan'

const TITLE = 'Pricing — Free Car Rental Software | éPure Drive'
const DESCRIPTION =
  'éPure Drive pricing: the Starter plan is free forever — branded booking site, online payments and fleet management. No credit card, no setup fee.'

export const metadata: Metadata = articleMetadata({ title: TITLE, description: DESCRIPTION, path: '/pricing', type: 'website' })

const STARTER_FEATURES = [
  'Up to 5 vehicles',
  'Branded booking site on yourbrand.epuredrive.com, with SSL',
  'Live availability calendar and online booking',
  'Online card payments through your own Stripe or Square account',
  'QuickBooks sync',
  'Booking, customer and fleet management in one dashboard',
  'Email support',
]

const PAID_PLANS = [
  { name: 'Pro', price: '$19', detail: 'Up to 25 vehicles, your own domain, tax reports, full brand customization, 1% platform fee.' },
  { name: 'Max', price: '$39', detail: 'Up to 60 vehicles, 0% platform fee, API access, priority support.' },
]

export default function PricingPage() {
  const freeLaunch = isFreeLaunchMode()

  return (
    <ArticleShell
      badge="Pricing"
      title={<>Free to start.<br /><span className="text-gradient">Free forever on Starter.</span></>}
      intro={
        <>
          The Starter plan costs $0 a month, with no credit card and no setup fee.
          {freeLaunch
            ? ' During our launch period, every account also gets every paid feature at no cost.'
            : ' Upgrade when you need more vehicles or advanced features.'}
        </>
      }
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'Pricing', path: '/pricing' },
      ]}
      ctaTitle="Your booking site can be live today."
      ctaText="Create your account, add your vehicles and share your link. Free forever on Starter."
    >
      <div className="grid gap-6 md:grid-cols-2 !mt-0">
        <div className="relative rounded-3xl p-px bg-gradient-to-b from-white/[0.2] via-white/[0.08] to-white/[0.02]">
          <div className="h-full rounded-3xl bg-black px-7 py-8">
            <p className="text-[11px] font-bold tracking-[0.25em] text-white/40 uppercase">Starter</p>
            <p className="mt-3 text-5xl font-extrabold text-white tracking-tight">
              $0<span className="text-base font-medium text-white/40"> / month, forever</span>
            </p>
            <ul className="mt-6 space-y-3 text-sm text-white/65 list-none pl-0">
              {STARTER_FEATURES.map((f) => (
                <li key={f} className="flex gap-3">
                  <svg className="w-4 h-4 mt-0.5 text-white/50 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/sign-up"
              className="mt-8 block text-center bg-white text-black font-semibold px-6 py-3.5 rounded-xl hover:bg-white/90 transition-colors no-underline"
            >
              Start free
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] px-7 py-8">
          {freeLaunch ? (
            <>
              <p className="text-[11px] font-bold tracking-[0.25em] text-white/40 uppercase">Free launch period</p>
              <p className="mt-3 text-2xl font-bold text-white tracking-tight">Every paid feature, included</p>
              <p className="mt-4 text-sm text-white/55 leading-relaxed">
                While we launch, every account gets the features planned for our paid plans at no cost:
                live telematics, integrations, team management, custom rental agreements and priority support.
                A flat 1% platform fee applies to online payments.
              </p>
              <p className="mt-4 text-sm text-white/55 leading-relaxed">
                Paid plans (Pro, Max and Enterprise) will be announced later. Existing accounts get at least
                30 days&apos; notice before any change, and the Starter plan stays free.
              </p>
            </>
          ) : (
            <>
              <p className="text-[11px] font-bold tracking-[0.25em] text-white/40 uppercase">Paid plans</p>
              <div className="mt-4 space-y-5">
                {PAID_PLANS.map((p) => (
                  <div key={p.name}>
                    <p className="text-white font-semibold">
                      {p.name} <span className="text-white/40 font-normal">— {p.price} / month</span>
                    </p>
                    <p className="text-sm text-white/55 mt-1">{p.detail}</p>
                  </div>
                ))}
              </div>
            </>
          )}
          <p className="mt-6 text-sm text-white/55">
            Running multiple locations? Enterprise pricing is custom —{' '}
            <a href="mailto:info@epuredrive.com?subject=Enterprise%20pricing">email us</a>.
          </p>
        </div>
      </div>

      <h2>What you pay, and to whom</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cost</th>
              <th>Amount</th>
              <th>Paid to</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Subscription (Starter)</td>
              <td>$0 / month</td>
              <td>—</td>
            </tr>
            <tr>
              <td>Platform fee on online payments</td>
              <td>{freeLaunch ? '1% during the launch period' : 'Depends on plan (see Terms)'}</td>
              <td>éPure Drive</td>
            </tr>
            <tr>
              <td>Card processing</td>
              <td>Your processor&apos;s standard rate</td>
              <td>Stripe or Square</td>
            </tr>
            <tr>
              <td>Setup, onboarding, cancellation</td>
              <td>$0</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Payments go straight from your customer to your own Stripe or Square account; we never hold your money.
        The fee schedule that applies after the launch period is in our <Link href="/terms">Terms of Service</Link>.
      </p>

      <h2>How this compares</h2>
      <p>
        Most rental software charges a monthly subscription whether or not you have bookings. Published plans
        for HQ Rental Software start around $120 a month, and RentSyst starts around €55 a month for small fleets.
        See the side-by-side breakdowns: <Link href="/compare/hq-rental">éPure Drive vs HQ Rental</Link> and{' '}
        <Link href="/compare/rentsyst">éPure Drive vs RentSyst</Link>.
      </p>

      <h2>Pricing questions</h2>
      <h3>Is the Starter plan really free forever?</h3>
      <p>
        Yes. Starter has no monthly fee and no time limit. You only pay the platform fee on payments you
        collect online, plus your card processor&apos;s fee.
      </p>
      <h3>Do I need a credit card to sign up?</h3>
      <p>No. You can create your account, add vehicles and publish your booking site without payment details.</p>
      <h3>What happens to my data if I leave?</h3>
      <p>
        You can export your fleet, bookings and customers at any time. If you cancel a paid plan, your free
        Starter plan stays active.
      </p>
      <p>
        More answers on the <Link href="/faq">FAQ page</Link>.
      </p>
    </ArticleShell>
  )
}
