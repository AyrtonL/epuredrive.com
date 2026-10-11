import type { Metadata } from 'next'
import Link from 'next/link'
import ArticleShell, { articleMetadata, buildArticleSchema } from '@/components/marketing/ArticleShell'

const PATH = '/guides/turo-to-direct-bookings'
const TITLE = 'From Turo to Direct Bookings: A Host’s Guide | éPure Drive'
const DESCRIPTION =
  'How Turo hosts add direct bookings without breaking Turo’s rules: what Turo keeps, what changes on insurance and taxes, and how to avoid double bookings.'
const PUBLISHED = '2026-10-10'

export const metadata: Metadata = articleMetadata({ title: TITLE, description: DESCRIPTION, path: PATH })

export default function TuroGuidePage() {
  return (
    <ArticleShell
      badge="Guide"
      title={<>From Turo to <span className="text-gradient">direct bookings</span></>}
      intro="Turo is a great way to fill a calendar, but it keeps a share of every trip and sets the rules. Adding a direct booking channel lets you keep more of each rental — as long as you build it the right way."
      updated="October 10, 2026"
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'From Turo to direct bookings', path: PATH },
      ]}
      schema={[
        buildArticleSchema({
          headline: 'From Turo to direct bookings: a host’s guide',
          description: DESCRIPTION,
          path: PATH,
          datePublished: PUBLISHED,
        }),
      ]}
    >
      <h2>What Turo keeps</h2>
      <p>
        In the US, Turo hosts choose an earnings plan. The host share of the trip price is <strong>70%</strong> on
        the More peace of mind plan, <strong>80%</strong> on Balanced and <strong>90%</strong> on More earnings, with
        less protection the more you keep. On a $700 week that is $70 to $210 that stays with Turo.
      </p>
      <p>
        A direct booking keeps the full trip price, minus card processing and your booking software. In exchange,
        you take on what Turo was handling: insurance, payments, taxes and customer support.
      </p>

      <h2>The rule you must not break</h2>
      <p className="callout">
        Don&apos;t take guests you met on Turo off the platform. Turo prohibits requesting or accepting payment
        outside Turo, by any method. A violation voids your Turo protection for that trip and can bring a $150
        fee, removal from Turo, and liquidated damages of $5,500 under Turo&apos;s terms.
      </p>
      <p>
        So the goal isn&apos;t to move Turo guests. It is to build demand that never came through Turo, and to run
        both channels side by side.
      </p>

      <h2>Where direct customers come from</h2>
      <ul>
        <li><strong>Search:</strong> a Google Business Profile and a booking site that shows up for &ldquo;car rental + your city&rdquo;.</li>
        <li><strong>Social:</strong> Instagram, Facebook and neighborhood groups that link straight to your booking page.</li>
        <li><strong>Local partners:</strong> hotels, body shops and dealerships that need replacement or loaner cars.</li>
        <li><strong>Word of mouth:</strong> customers who found you directly and come back, with their friends.</li>
      </ul>

      <h2>What changes when you rent directly</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>On Turo</th>
              <th>Direct</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Your share of the trip</td>
              <td>70%–90%, by plan</td>
              <td>100%, minus card processing</td>
            </tr>
            <tr>
              <td>Insurance</td>
              <td>Turo&apos;s protection plan for that trip</td>
              <td>Your own commercial rental policy — Turo protection doesn&apos;t apply</td>
            </tr>
            <tr>
              <td>Payments and deposits</td>
              <td>Collected by Turo</td>
              <td>Collected by you, ideally online before pickup</td>
            </tr>
            <tr>
              <td>Taxes and surcharges</td>
              <td>Turo collects the peer-to-peer surcharge</td>
              <td>You collect and file sales tax and any rental surcharge (in Florida, $2 per day)</td>
            </tr>
            <tr>
              <td>Rental agreement</td>
              <td>Turo&apos;s terms</td>
              <td>Your own agreement, signed by each renter</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        In Florida specifically, see <Link href="/guides/start-car-rental-business-florida">how to start a car rental business in Florida</Link>{' '}
        for sales tax registration, the surcharge and liability limits.
      </p>

      <h2>Run both channels without double bookings</h2>
      <ol>
        <li>Set up commercial insurance that covers direct rentals before your first direct trip.</li>
        <li>Publish a booking site with live availability, online payment and a digital rental agreement.</li>
        <li>Keep calendars in step: import Turo trips so they block your site, and block each direct trip on your Turo calendar.</li>
        <li>Price direct rentals so they compete with Turo after taxes, but still beat your Turo net.</li>
        <li>Send every new direct customer a confirmation, pickup instructions and a receipt automatically.</li>
      </ol>
      <p>
        éPure Drive handles steps 2, 3 and 5: a branded booking site on your own subdomain, Stripe or Square payments
        into your account, digital agreements, and Turo and iCal sync that imports your Turo trips so those dates can&apos;t be
        booked on your site. The Starter plan is free forever — <Link href="/pricing">see pricing</Link>.
      </p>

      <h2>Sources</h2>
      <ul className="sources">
        <li><a href="https://help.turo.com/en_us/earnings-plans-in-detail-us-hosts-ByMOIVxEc" rel="noopener" target="_blank">Turo — Earnings plans in detail (US hosts)</a></li>
        <li><a href="https://help.turo.com/en_us/gray-market-transaction-policy-or-hosts-SJOUUNlN5" rel="noopener" target="_blank">Turo — Gray market transaction policy (hosts)</a></li>
        <li><a href="https://m.flsenate.gov/Statutes/212.0606" rel="noopener" target="_blank">Florida Statutes s. 212.0606 — rental car surcharge</a></li>
      </ul>
    </ArticleShell>
  )
}
