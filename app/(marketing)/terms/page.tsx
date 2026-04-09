import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms & Conditions — éPure Drive',
  description:
    'Read the full terms and conditions for renting a vehicle with éPure Drive in Miami, Aventura, and South Florida.',
}

function SectionHeading({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-bold text-white mb-4 pb-3 border-b border-white/10 flex items-center gap-3">
      <span className="bg-white text-black text-[11px] font-extrabold px-2 py-0.5 rounded min-w-[28px] text-center">
        {num}
      </span>
      {children}
    </h2>
  )
}

export default function TermsPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-28 pb-12 border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-6">
          <span className="text-[11px] font-bold tracking-[0.3em] text-white/25 uppercase block mb-4">
            Legal
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
            Terms &amp; Conditions
          </h1>
          <p className="text-white/40 text-sm">
            Last updated: March 2026 · éPure Drive / Route 305 Rental Car · Aventura, Florida
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6 space-y-12">

          {/* TOC */}
          <nav className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
            <h3 className="text-[11px] font-bold tracking-[0.2em] text-white/40 uppercase mb-4">
              Table of Contents
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 text-sm text-white/50">
              <li><a href="#eligibility" className="hover:text-white transition-colors">Eligibility &amp; Requirements</a></li>
              <li><a href="#reservation" className="hover:text-white transition-colors">Reservations &amp; Booking</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing &amp; Fees</a></li>
              <li><a href="#insurance" className="hover:text-white transition-colors">Insurance &amp; Coverage</a></li>
              <li><a href="#vehicle-use" className="hover:text-white transition-colors">Vehicle Use &amp; Prohibited Uses</a></li>
              <li><a href="#damage" className="hover:text-white transition-colors">Damage, Loss &amp; Liability</a></li>
              <li><a href="#fuel" className="hover:text-white transition-colors">Fuel Policy</a></li>
              <li><a href="#mileage" className="hover:text-white transition-colors">Mileage Policy</a></li>
              <li><a href="#cancellation" className="hover:text-white transition-colors">Cancellation &amp; Modifications</a></li>
              <li><a href="#tolls" className="hover:text-white transition-colors">Tolls &amp; Traffic Violations</a></li>
              <li><a href="#privacy-data" className="hover:text-white transition-colors">Personal Data &amp; Privacy</a></li>
              <li><a href="#governing" className="hover:text-white transition-colors">Governing Law &amp; Dispute Resolution</a></li>
            </ol>
          </nav>

          {/* 1 */}
          <div id="eligibility" className="scroll-mt-24">
            <SectionHeading num={1}>Eligibility &amp; Requirements</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>To rent a vehicle with éPure Drive, you must meet <strong className="text-white/70">all</strong> of the following requirements at the time of rental:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Be <strong className="text-white/70">at least 21 years of age</strong> (25+ required for vehicles valued over $75,000).</li>
                <li>Hold a <strong className="text-white/70">valid driver&apos;s license</strong> in good standing. Foreign licenses are accepted with an International Driving Permit (IDP).</li>
                <li>Provide a <strong className="text-white/70">valid credit or debit card</strong> in the renter&apos;s name for the security deposit.</li>
                <li>Have <strong className="text-white/70">valid personal auto insurance</strong> that covers rented vehicles, OR purchase our coverage at the time of rental.</li>
                <li>Present a <strong className="text-white/70">valid government-issued photo ID</strong>.</li>
              </ul>
              <div className="bg-white/[0.03] border border-white/[0.06] border-l-2 border-l-white/20 rounded-r-lg p-4 mt-4">
                Additional drivers must also meet all eligibility requirements and be listed on the Rental Agreement prior to operating the vehicle. An additional driver fee of <strong className="text-white/70">$50 per rental period</strong> may apply.
              </div>
            </div>
          </div>

          {/* 2 */}
          <div id="reservation" className="scroll-mt-24">
            <SectionHeading num={2}>Reservations &amp; Booking</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>All reservations are subject to vehicle availability. A reservation confirmation does not guarantee a specific vehicle but guarantees the vehicle class/category booked. éPure Drive reserves the right to substitute a vehicle of equal or greater value at no additional charge.</p>
              <p>Reservations can be made via our website, WhatsApp, or email. A <strong className="text-white/70">security deposit</strong> is required at the time of vehicle handoff. No payment is required to place a reservation.</p>
              <p>By completing a reservation, you confirm that you have read and agree to these Terms &amp; Conditions in their entirety.</p>
            </div>
          </div>

          {/* 3 */}
          <div id="pricing" className="scroll-mt-24">
            <SectionHeading num={3}>Pricing &amp; Fees</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>Our rental rates are as listed on the vehicle detail page at the time of booking. All prices are in US Dollars. The following additional charges may apply:</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse mt-2">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-[11px] uppercase tracking-wider text-white/40 font-semibold py-2 pr-4">Fee / Charge</th>
                      <th className="text-left text-[11px] uppercase tracking-wider text-white/40 font-semibold py-2 pr-4">Amount</th>
                      <th className="text-left text-[11px] uppercase tracking-wider text-white/40 font-semibold py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/50">
                    <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4">Florida State Tax</td><td className="py-2 pr-4">9.5%</td><td className="py-2">Applied to rental subtotal</td></tr>
                    <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4">Airport Delivery (MIA/FLL)</td><td className="py-2 pr-4">$120</td><td className="py-2">Each way; Aventura pickup is free</td></tr>
                    <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4">Additional Driver</td><td className="py-2 pr-4">$50</td><td className="py-2">Per rental period</td></tr>
                    <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4">Premium Insurance Coverage</td><td className="py-2 pr-4">$149/day</td><td className="py-2">Reduces deductible to $0</td></tr>
                    <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4">Prepaid Fuel Option</td><td className="py-2 pr-4">$95</td><td className="py-2">Return at any fuel level</td></tr>
                    <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4">Mileage Overage</td><td className="py-2 pr-4">$0.25/mile</td><td className="py-2">Beyond included miles</td></tr>
                    <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4">Cleaning Fee</td><td className="py-2 pr-4">$75–$250</td><td className="py-2">Excessively dirty condition</td></tr>
                    <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4">Smoking/Vaping Fee</td><td className="py-2 pr-4">$350</td><td className="py-2">Evidence of smoking inside vehicle</td></tr>
                    <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4">Late Return Fee</td><td className="py-2 pr-4">1 day rate</td><td className="py-2">Per day beyond due-in date</td></tr>
                    <tr><td className="py-2 pr-4">Key Replacement</td><td className="py-2 pr-4">At cost</td><td className="py-2">Typically $200–$600</td></tr>
                  </tbody>
                </table>
              </div>
              <p>All charges are subject to a final audit. The security deposit will be returned within <strong className="text-white/70">3–5 business days</strong> of vehicle return, pending inspection.</p>
            </div>
          </div>

          {/* 4 */}
          <div id="insurance" className="scroll-mt-24">
            <SectionHeading num={4}>Insurance &amp; Coverage</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>éPure Drive vehicles are insured by the owner (Route 305 Rental Car). Renters must provide one of the following:</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li><strong className="text-white/70">Personal auto insurance</strong> — must be a USA-based policy that extends to rental vehicles.</li>
                <li><strong className="text-white/70">Credit card rental protection</strong> — coverage provided by your credit card issuer as secondary coverage.</li>
                <li><strong className="text-white/70">éPure Drive Coverage</strong> — purchased at the time of rental:
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li><em>Standard Coverage:</em> Deductible: $1,000 (vehicles under $35k) / $2,500 (vehicles $35k+).</li>
                    <li><em>Premium Coverage:</em> $149/day. Reduces deductible to $0.</li>
                  </ul>
                </li>
              </ol>
              <div className="bg-red-500/[0.06] border border-red-500/20 border-l-2 border-l-red-500/50 rounded-r-lg p-4 mt-4">
                <strong className="text-red-400">No Insurance / Declined Coverage:</strong> If you decline to provide valid insurance and decline to purchase our coverage, you assume <strong className="text-white/70">full and unlimited personal liability</strong> for any damage, injuries, and property damage — regardless of fault.
              </div>
              <p>Coverage is automatically <strong className="text-white/70">voided</strong> if any prohibited use occurs (see Section 5), if you fail to report an accident promptly, or if you provide false information.</p>
            </div>
          </div>

          {/* 5 */}
          <div id="vehicle-use" className="scroll-mt-24">
            <SectionHeading num={5}>Vehicle Use &amp; Prohibited Uses</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>The Vehicle must be operated only by Authorized Drivers listed on the Rental Agreement. The following uses are <strong className="text-white/70">strictly prohibited</strong> and will result in immediate termination, forfeiture of the security deposit, and void of all insurance coverage:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Operation by anyone not listed as an Authorized Driver.</li>
                <li>Operating under the influence of alcohol, prescription drugs, or controlled substances.</li>
                <li>Use for any illegal purpose or in violation of any law.</li>
                <li>Use for hire (rideshare, taxi, delivery, etc.) or towing.</li>
                <li>Participation in any race, speed test, or contest.</li>
                <li>Teaching anyone to drive.</li>
                <li>Transporting hazardous, flammable, or illegal materials.</li>
                <li>Operation outside the State of Florida without prior written approval.</li>
                <li>Driving on unpaved, off-road, or flooded roads.</li>
                <li>Carrying more passengers than the Vehicle has seat belts.</li>
                <li>Odometer tampering or disconnection.</li>
                <li>Smoking, vaping, or using e-cigarettes inside the Vehicle.</li>
                <li>Transporting animals without prior written approval.</li>
              </ul>
            </div>
          </div>

          {/* 6 */}
          <div id="damage" className="scroll-mt-24">
            <SectionHeading num={6}>Damage, Loss &amp; Liability</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>You are responsible for all damage to the Vehicle during the rental period, regardless of fault or cause, including acts of nature, weather, terrain, and vandalism.</p>
              <p>In the event of an accident or damage:</p>
              <ol className="list-decimal pl-5 space-y-1.5">
                <li>Stop immediately and ensure the safety of all parties.</li>
                <li>Call 911 if there are injuries or significant property damage.</li>
                <li>Contact éPure Drive immediately via WhatsApp at <strong className="text-white/70">(786) 209-6770</strong>.</li>
                <li>Do not admit fault or make any statements regarding liability.</li>
                <li>Document the scene with photos and obtain witness information.</li>
                <li>File a police report if required by law.</li>
              </ol>
              <p>In addition to repair costs and administrative fees, you may be liable for <strong className="text-white/70">loss of use</strong> — calculated at the daily rental rate for each day the vehicle is unavailable while being repaired.</p>
            </div>
          </div>

          {/* 7 */}
          <div id="fuel" className="scroll-mt-24">
            <SectionHeading num={7}>Fuel Policy</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>Vehicles are provided with a <strong className="text-white/70">full tank of fuel</strong> and must be returned with a full tank. If the Vehicle is returned with less fuel, a <strong className="text-white/70">refueling fee of $15 per gallon</strong> (or current market rate, whichever is higher) plus a service fee of $35 will be charged.</p>
              <p>If you purchase the <strong className="text-white/70">Prepaid Fuel Option</strong> ($95), you may return the Vehicle at any fuel level. No refund is issued for unused fuel.</p>
            </div>
          </div>

          {/* 8 */}
          <div id="mileage" className="scroll-mt-24">
            <SectionHeading num={8}>Mileage Policy</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>Each rental includes a mileage allowance as stated in the Rental Agreement. Miles driven beyond the included allowance will be billed at <strong className="text-white/70">$0.25 per mile</strong>.</p>
              <p>If the odometer is found to have been tampered with, mileage charges will be estimated based on route and usage history, and you will be liable for the maximum estimated overage plus a $500 tampering fee.</p>
            </div>
          </div>

          {/* 9 */}
          <div id="cancellation" className="scroll-mt-24">
            <SectionHeading num={9}>Cancellation &amp; Modifications</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>éPure Drive offers <strong className="text-white/70">free cancellation</strong> for reservations cancelled at least <strong className="text-white/70">48 hours before the scheduled pickup time</strong>. Cancellations made within 48 hours may be subject to a cancellation fee equal to <strong className="text-white/70">one day&apos;s rental rate</strong>.</p>
              <p>To cancel or modify a reservation, contact us via WhatsApp at <strong className="text-white/70">(786) 209-6770</strong> or email <strong className="text-white/70">info@epuredrive.com</strong>.</p>
              <div className="bg-white/[0.03] border border-white/[0.06] border-l-2 border-l-white/20 rounded-r-lg p-4 mt-4">
                Early returns: If you return the vehicle before the agreed due-in date, no refund will be issued for unused rental days unless otherwise agreed in writing at the time of booking.
              </div>
            </div>
          </div>

          {/* 10 */}
          <div id="tolls" className="scroll-mt-24">
            <SectionHeading num={10}>Tolls &amp; Traffic Violations</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>You are solely responsible for all tolls, parking citations, red-light camera fees, speed camera fees, and any other fines incurred during your rental period.</p>
              <p>Florida operates a cashless toll system (SunPass) on many roads. Unpaid tolls may result in a fine plus an <strong className="text-white/70">administrative fee of $25 per toll transaction</strong>.</p>
              <p>If we receive a violation notice related to your rental, you authorize us to charge the full amount of the fine plus a $35 administrative processing fee to your payment method on file.</p>
            </div>
          </div>

          {/* 11 */}
          <div id="privacy-data" className="scroll-mt-24">
            <SectionHeading num={11}>Personal Data &amp; Privacy</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>We collect personal information necessary to process your rental. This information is used solely for rental operations and may be disclosed to law enforcement when required by law.</p>
              <p>Vehicles may be equipped with GPS tracking and event data recorders. By renting the Vehicle, you consent to monitoring of the vehicle&apos;s location and operational data.</p>
              <p>Before returning the Vehicle, please <strong className="text-white/70">delete all personal data</strong> from the vehicle&apos;s infotainment system (paired phones, navigation history, contacts).</p>
              <p>For full details, see our <Link href="/privacy" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">Privacy Policy</Link>.</p>
            </div>
          </div>

          {/* 12 */}
          <div id="governing" className="scroll-mt-24">
            <SectionHeading num={12}>Governing Law &amp; Dispute Resolution</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>This Agreement is governed by the laws of the <strong className="text-white/70">State of Florida</strong>. Any disputes arising from this Agreement shall be resolved exclusively in the state or federal courts of <strong className="text-white/70">Miami-Dade County or Broward County, Florida</strong>.</p>
              <p>If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will continue in full force and effect.</p>
              <div className="bg-white/[0.03] border border-white/[0.06] border-l-2 border-l-white/20 rounded-r-lg p-4 mt-4">
                We encourage you to contact us first to resolve any concerns before pursuing legal action. We are available 24/7 via WhatsApp at <strong className="text-white/70">(786) 209-6770</strong>.
              </div>
            </div>
          </div>

          {/* Last updated */}
          <div className="pt-8 border-t border-white/[0.06]">
            <p className="text-xs text-white/20">
              Last updated: March 2026 · éPure Drive / Route 305 Rental Car · Aventura, Florida ·{' '}
              Questions? <a href="https://wa.me/15615461461" className="text-white/30 hover:text-white transition-colors">Contact us on WhatsApp</a>
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
