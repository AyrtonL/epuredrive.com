import type { Metadata } from 'next'
import Link from 'next/link'
import ArticleShell, { articleMetadata, buildArticleSchema } from '@/components/marketing/ArticleShell'

const PATH = '/guides/start-car-rental-business-florida'
const TITLE = 'Start a Car Rental Business in Florida (2026) | éPure Drive'
const DESCRIPTION =
  'Start a car rental business in Florida: LLC filing, sales tax, the $2/day rental surcharge, insurance limits and taking bookings online.'
const PUBLISHED = '2026-10-10'

export const metadata: Metadata = articleMetadata({ title: TITLE, description: DESCRIPTION, path: PATH })

export default function FloridaGuidePage() {
  return (
    <ArticleShell
      badge="Guide"
      title={<>How to start a car rental business <span className="text-gradient">in Florida</span></>}
      intro="Forming the company takes a day. Getting taxes, the rental car surcharge and insurance right is what keeps a Florida rental business out of trouble. This guide walks through each step in order."
      updated="October 10, 2026"
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'Start a car rental business in Florida', path: PATH },
      ]}
      schema={[
        buildArticleSchema({
          headline: 'How to start a car rental business in Florida',
          description: DESCRIPTION,
          path: PATH,
          datePublished: PUBLISHED,
        }),
      ]}
    >
      <p className="callout">
        This guide is general information, not legal, tax or insurance advice. Rules and fees change; confirm
        your situation with a Florida CPA, attorney and commercial insurance broker.
      </p>

      <h2>The checklist</h2>
      <ol>
        <li>Form a Florida LLC.</li>
        <li>Get an EIN and a business bank account.</li>
        <li>Register with the Florida Department of Revenue to collect sales tax.</li>
        <li>Charge sales tax, county surtax and the rental car surcharge on every rental.</li>
        <li>Insure the fleet for commercial rental use.</li>
        <li>Put rental agreements, deposits and online payments in place.</li>
        <li>Launch a booking channel you own.</li>
      </ol>

      <h2>1. Form a Florida LLC</h2>
      <p>
        Most independent operators use a limited liability company. You file Articles of Organization with
        the Florida Division of Corporations (Sunbiz). The filing fee is <strong>$125</strong>. Every year the LLC
        files an annual report between <strong>January 1 and May 1</strong>; the fee is <strong>$138.75</strong>, and
        missing the May 1 deadline adds a <strong>$400</strong> late fee.
      </p>
      <p>
        Decide early who owns the cars. If vehicles are titled to you personally, a written lease between you and
        the LLC keeps the paper trail clear for taxes, lenders and insurers. Ask your CPA which setup fits.
      </p>

      <h2>2. Get an EIN and separate your money</h2>
      <p>
        Request an Employer Identification Number from the IRS (it&apos;s free), open a business bank account, and
        route every rental payment and expense through it. Clean books make sales tax filing and your annual
        return much easier.
      </p>

      <h2>3. Register to collect sales tax</h2>
      <p>
        Vehicle rentals are taxable in Florida. Register with the Florida Department of Revenue using the
        Florida Business Tax Application (Form DR-1), online or on paper. After registration you file sales tax
        returns on the schedule the Department assigns.
      </p>

      <h2>4. Charge the right taxes and the surcharge</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Charge</th>
              <th>Rate</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>State sales tax</td>
              <td>6%</td>
              <td>On the rental charge</td>
            </tr>
            <tr>
              <td>County discretionary surtax</td>
              <td>0%–2.5%, set by county</td>
              <td>Miami-Dade and Broward: 1% (7% combined)</td>
            </tr>
            <tr>
              <td>Rental car surcharge</td>
              <td>$2 per day or part of a day</td>
              <td>First 30 days of each rental; vehicles for fewer than 9 passengers; the surcharge itself is subject to sales tax</td>
            </tr>
            <tr>
              <td>Peer-to-peer car-sharing surcharge</td>
              <td>$1 per day</td>
              <td>Applies to Turo-style trips; the platform collects it, not you</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        The rental car surcharge is reported by county: it is attributed to the county where the rental agreement
        is made, which is where the customer picks up the car. Check the Department of Revenue&apos;s current
        surtax schedule (Form DR-15DSS) before you set your checkout taxes.
      </p>

      <h2>5. Insure the fleet for rental use</h2>
      <p>
        Personal auto policies generally don&apos;t cover renting your car to the public. You need a commercial
        rental policy, usually through a broker who specializes in rental fleets.
      </p>
      <p>
        Florida caps a rental company&apos;s liability as the owner of a car rented for less than a year at
        <strong> $100,000 per person</strong> and <strong>$300,000 per incident</strong> for bodily injury, and
        <strong> $50,000</strong> for property damage. If the renter is uninsured, or carries less than $500,000
        in combined coverage, the owner can be liable for up to an additional <strong>$500,000</strong> in
        economic damages (s. 324.021(9)(b)2, Florida Statutes). At the federal level, the Graves Amendment
        generally shields rental owners from liability for a renter&apos;s driving when the owner wasn&apos;t
        negligent. Your broker can size coverage around both.
      </p>

      <h2>6. Agreements, deposits and payments</h2>
      <ul>
        <li>Use a written rental agreement for every booking: driver details, mileage, fuel, tolls, damage and late returns.</li>
        <li>Take a security deposit or card authorization, and photograph the car at pickup and return.</li>
        <li>Collect payment online before the trip, through a processor that pays into your own account.</li>
        <li>Plan for tolls: most Florida highways are cashless, so decide how you pass toll charges to renters.</li>
        <li>If you offer airport delivery to MIA or FLL, check each airport&apos;s rules for commercial pickups first.</li>
      </ul>

      <h2>7. Take bookings on a channel you own</h2>
      <p>
        Many Florida operators start on Turo. It brings demand, but every trip is priced, paid and governed on
        Turo&apos;s terms. A booking site of your own lets repeat and local customers reserve with you directly.
        éPure Drive gives you that site on day one: live availability, online payments through Stripe or Square,
        digital agreements, and Turo calendar sync that blocks dates already booked on Turo.{' '}
        <Link href="/guides/turo-to-direct-bookings">Read how to move from Turo to direct bookings</Link>, or{' '}
        <Link href="/pricing">see pricing</Link> (Starter is free forever).
      </p>

      <h2>Sources</h2>
      <ul className="sources">
        <li><a href="https://m.flsenate.gov/Statutes/212.0606" rel="noopener" target="_blank">Florida Statutes s. 212.0606 — rental car surcharge</a></li>
        <li><a href="https://m.flsenate.gov/Statutes/324.021" rel="noopener" target="_blank">Florida Statutes s. 324.021 — owner and lessor liability</a></li>
        <li><a href="https://floridarevenue.com/Forms_library/current/gt800013.pdf" rel="noopener" target="_blank">Florida Department of Revenue — Florida Sales and Use Tax brochure (GT-800013)</a></li>
        <li><a href="https://floridarevenue.com/taxes/tips/documents/TIP_04A01-02.pdf" rel="noopener" target="_blank">Florida Department of Revenue — Tax Information Publication 04A01-02 (surcharge by county)</a></li>
        <li><a href="https://stripe.com/resources/more/how-to-start-an-llc-in-florida" rel="noopener" target="_blank">Stripe — How to start an LLC in Florida (filing and annual report fees)</a></li>
        <li><a href="https://www.floridasalestax.com/florida-tax-law-blog/2026/august/florida-county-surtax-rates-for-2026-the-complet/" rel="noopener" target="_blank">FloridaSalesTax.com — Florida county surtax rates for 2026</a></li>
        <li><a href="https://lewisbrisbois.com/newsroom/legal-alerts/real-renters-insurance-the-graves-amendment-rental-vehicle-liability" rel="noopener" target="_blank">Lewis Brisbois — The Graves Amendment and rental vehicle liability</a></li>
      </ul>
    </ArticleShell>
  )
}
