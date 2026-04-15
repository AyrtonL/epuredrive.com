import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — éPure Drive',
  description:
    'Terms of Service for the éPure Drive software platform — account, subscription, acceptable use, tenant responsibilities, and limitation of liability.',
  alternates: { canonical: 'https://epuredrive.com/terms' },
  openGraph: {
    title: 'Terms of Service — éPure Drive',
    description:
      'Terms of Service for the éPure Drive software platform — account, subscription, acceptable use, tenant responsibilities, and limitation of liability.',
    url: 'https://epuredrive.com/terms',
  },
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
            Terms of Service
          </h1>
          <p className="text-white/40 text-sm">
            Last updated: April 2026 · éPure LLC
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6 space-y-12">

          {/* Intro */}
          <div className="bg-white/[0.03] border border-white/[0.06] border-l-2 border-l-white/20 rounded-r-lg p-4 text-sm text-white/50 leading-relaxed">
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the éPure Drive software platform provided by <strong className="text-white/70">éPure LLC</strong> (&ldquo;éPure&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). éPure Drive is a software-as-a-service platform that enables rental businesses (&ldquo;Tenants&rdquo;) to manage their fleet, bookings, customers, and operations. <strong className="text-white/70">éPure does not own, rent, insure, or operate vehicles.</strong> All rental transactions and vehicle-related obligations are between each Tenant and its own customers. By creating an account or using the Service, you agree to these Terms.
          </div>

          {/* TOC */}
          <nav className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
            <h3 className="text-[11px] font-bold tracking-[0.2em] text-white/40 uppercase mb-4">
              Table of Contents
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 text-sm text-white/50">
              <li><a href="#definitions" className="hover:text-white transition-colors">Definitions</a></li>
              <li><a href="#account" className="hover:text-white transition-colors">Account &amp; Eligibility</a></li>
              <li><a href="#service" className="hover:text-white transition-colors">The Service</a></li>
              <li><a href="#plans" className="hover:text-white transition-colors">Plans, Billing &amp; Refunds</a></li>
              <li><a href="#tenant" className="hover:text-white transition-colors">Tenant Responsibilities</a></li>
              <li><a href="#acceptable-use" className="hover:text-white transition-colors">Acceptable Use</a></li>
              <li><a href="#end-user-data" className="hover:text-white transition-colors">End User Data</a></li>
              <li><a href="#ip" className="hover:text-white transition-colors">Intellectual Property</a></li>
              <li><a href="#availability" className="hover:text-white transition-colors">Service Availability &amp; Support</a></li>
              <li><a href="#disclaimers" className="hover:text-white transition-colors">Disclaimers &amp; Limitation of Liability</a></li>
              <li><a href="#indemnification" className="hover:text-white transition-colors">Indemnification</a></li>
              <li><a href="#termination" className="hover:text-white transition-colors">Termination</a></li>
              <li><a href="#governing" className="hover:text-white transition-colors">Governing Law &amp; Disputes</a></li>
            </ol>
          </nav>

          {/* 1 */}
          <div id="definitions" className="scroll-mt-24">
            <SectionHeading num={1}>Definitions</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-white/70">&ldquo;Service&rdquo;</strong> — the éPure Drive software platform, including the website, dashboard, APIs, and any related tools or features provided by éPure LLC.</li>
                <li><strong className="text-white/70">&ldquo;Tenant&rdquo;</strong> — a business or individual that creates an account to use the Service to operate a rental business.</li>
                <li><strong className="text-white/70">&ldquo;End User&rdquo;</strong> — a customer of a Tenant whose data is collected or stored by the Tenant through the Service (for example, a renter, driver, or guest).</li>
                <li><strong className="text-white/70">&ldquo;Subscription&rdquo;</strong> — a recurring paid plan granting the Tenant access to the Service.</li>
                <li><strong className="text-white/70">&ldquo;Content&rdquo;</strong> — any data, text, images, documents, or other materials uploaded to or created via the Service.</li>
              </ul>
            </div>
          </div>

          {/* 2 */}
          <div id="account" className="scroll-mt-24">
            <SectionHeading num={2}>Account &amp; Eligibility</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>To use the Service, you must be at least 18 years old and legally capable of entering into a binding contract. If you register on behalf of a business, you represent that you are authorized to bind that business to these Terms.</p>
              <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify us immediately at <a href="mailto:info@epuredrive.com" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">info@epuredrive.com</a> if you suspect any unauthorized access.</p>
              <p>You must provide accurate, complete, and current information and keep it up to date. We may suspend or terminate accounts that contain false, misleading, or incomplete information.</p>
            </div>
          </div>

          {/* 3 */}
          <div id="service" className="scroll-mt-24">
            <SectionHeading num={3}>The Service</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>éPure provides a software platform that enables Tenants to manage fleet inventory, reservations, rental agreements, customer records, payments, invoices, digital signatures, and related operational workflows. The Service may include integrations with third-party providers (for example, Stripe for payment processing).</p>
              <p>The Service is provided on a subscription basis. Features available to a Tenant depend on the plan selected and may change over time as we add, improve, or retire functionality. We will make reasonable efforts to communicate material changes in advance.</p>
              <div className="bg-white/[0.03] border border-white/[0.06] border-l-2 border-l-white/20 rounded-r-lg p-4 mt-4">
                <strong className="text-white/70">éPure is a software provider only.</strong> We do not own vehicles, rent vehicles, hold vehicle insurance, collect security deposits, or act as a party to any rental agreement between a Tenant and its End Users.
              </div>
            </div>
          </div>

          {/* 4 */}
          <div id="plans" className="scroll-mt-24">
            <SectionHeading num={4}>Plans, Billing &amp; Refunds</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>Subscriptions are billed in advance on a monthly or annual basis, depending on the plan selected at signup. Fees are listed on our <Link href="/pricing" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">pricing page</Link> and are exclusive of any applicable taxes, which you are responsible for paying.</p>
              <p>Payments are processed by <strong className="text-white/70">Stripe, Inc.</strong> By providing your payment information, you authorize us (via Stripe) to charge the applicable fees to your payment method on a recurring basis until your Subscription is cancelled.</p>
              <p>You may cancel your Subscription at any time from your dashboard. Cancellation will take effect at the end of the current billing period; you retain access to paid features until that date.</p>
              <p><strong className="text-white/70">Fees are non-refundable</strong> except where required by law. We do not provide pro-rated refunds for partial billing periods, unused features, or early cancellation.</p>
              <p>We may change our pricing at any time. Price changes will be communicated at least <strong className="text-white/70">30 days in advance</strong> and will take effect at the start of your next billing period. Continued use of the Service after a price change constitutes acceptance of the new price.</p>
              <p>If a payment fails, we may suspend or downgrade your account until the balance is resolved. Accounts more than 30 days past due may be terminated.</p>
            </div>
          </div>

          {/* 5 */}
          <div id="tenant" className="scroll-mt-24">
            <SectionHeading num={5}>Tenant Responsibilities</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>Tenants are solely responsible for all aspects of their own rental business, including but not limited to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Ownership, registration, maintenance, and roadworthiness of all vehicles.</li>
                <li>Obtaining and maintaining all required <strong className="text-white/70">licenses, permits, and insurance</strong> (commercial auto, liability, and any other coverage required by law or prudent business practice).</li>
                <li>All agreements, contracts, pricing, deposits, fees, damages, and disputes with their End Users.</li>
                <li>Compliance with all applicable federal, state, and local laws — including rental, consumer protection, tax collection, data protection, anti-discrimination, and accessibility laws.</li>
                <li>The accuracy, legality, and appropriateness of all Content uploaded to or stored within the Service (including fleet listings, pricing, photos, and rental agreement templates).</li>
                <li>Obtaining any required consents from their End Users to collect, store, or process End User data via the Service.</li>
              </ul>
              <div className="bg-white/[0.03] border border-white/[0.06] border-l-2 border-l-white/20 rounded-r-lg p-4 mt-4">
                <strong className="text-white/70">éPure disclaims all responsibility</strong> for any rental-related activity, vehicle condition, accident, injury, loss, or dispute arising between a Tenant and its End Users. The Tenant is the sole counterparty in all rental transactions.
              </div>
            </div>
          </div>

          {/* 6 */}
          <div id="acceptable-use" className="scroll-mt-24">
            <SectionHeading num={6}>Acceptable Use</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>You agree not to use the Service to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Violate any applicable law, regulation, or third-party right.</li>
                <li>Upload, store, or transmit content that is unlawful, fraudulent, defamatory, obscene, discriminatory, or infringing.</li>
                <li>Attempt to gain unauthorized access to the Service, other accounts, or any underlying infrastructure.</li>
                <li>Reverse-engineer, decompile, scrape, or otherwise extract source code or non-public data from the Service.</li>
                <li>Interfere with, disrupt, or overload the Service (for example, by sending excessive requests or distributing malware).</li>
                <li>Resell, sublicense, or white-label the Service without éPure&apos;s prior written consent.</li>
                <li>Use the Service to send unsolicited commercial messages or to engage in deceptive marketing.</li>
              </ul>
              <p>Violations may result in immediate suspension or termination of your account without refund.</p>
            </div>
          </div>

          {/* 7 */}
          <div id="end-user-data" className="scroll-mt-24">
            <SectionHeading num={7}>End User Data</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>When a Tenant uses the Service to collect, store, or process information about its End Users, the <strong className="text-white/70">Tenant is the data controller</strong> and <strong className="text-white/70">éPure acts only as a data processor</strong> on the Tenant&apos;s behalf.</p>
              <p>Tenants must:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Have a lawful basis to collect and process End User data.</li>
                <li>Provide their End Users with a privacy notice that explains how data is used, stored, and shared.</li>
                <li>Honor End User rights (access, rectification, deletion, portability) as required by applicable law (for example, GDPR, CCPA).</li>
                <li>Not upload sensitive categories of data (such as payment card numbers, government ID numbers, or health data) beyond what is strictly necessary to operate their rental business.</li>
              </ul>
              <p>éPure will process End User data only as described in our <Link href="/privacy" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">Privacy Policy</Link> and in accordance with the Tenant&apos;s instructions.</p>
            </div>
          </div>

          {/* 8 */}
          <div id="ip" className="scroll-mt-24">
            <SectionHeading num={8}>Intellectual Property</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>The Service, including its software, design, trademarks, logos, and documentation, is owned by éPure LLC and is protected by intellectual property laws. We grant you a limited, non-exclusive, non-transferable, revocable license to use the Service in accordance with these Terms.</p>
              <p>You retain ownership of the Content you upload to the Service. By uploading Content, you grant éPure a worldwide, royalty-free license to host, store, process, display, and transmit that Content solely as necessary to provide the Service and to operate, maintain, and improve it.</p>
              <p>We welcome feedback and suggestions. If you send us feedback, you grant us a perpetual, irrevocable, royalty-free license to use it without restriction or compensation.</p>
            </div>
          </div>

          {/* 9 */}
          <div id="availability" className="scroll-mt-24">
            <SectionHeading num={9}>Service Availability &amp; Support</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>We strive to keep the Service available at all times, but we do not guarantee uninterrupted access. The Service may be temporarily unavailable due to scheduled maintenance, infrastructure issues, third-party provider outages, or events beyond our reasonable control.</p>
              <p>Support is provided via <a href="mailto:info@epuredrive.com" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">info@epuredrive.com</a> and via the in-app support form. Response times and support scope depend on your plan.</p>
            </div>
          </div>

          {/* 10 */}
          <div id="disclaimers" className="scroll-mt-24">
            <SectionHeading num={10}>Disclaimers &amp; Limitation of Liability</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p className="uppercase text-white/60 text-xs tracking-wider">Disclaimer of Warranties</p>
              <p>The Service is provided <strong className="text-white/70">&ldquo;as is&rdquo;</strong> and <strong className="text-white/70">&ldquo;as available&rdquo;</strong> without warranties of any kind, whether express, implied, or statutory. To the maximum extent permitted by law, éPure disclaims all warranties, including warranties of merchantability, fitness for a particular purpose, title, non-infringement, and any warranty arising from course of dealing or usage of trade.</p>
              <p>We do not warrant that the Service will be uninterrupted, error-free, secure, or free of viruses or harmful code, nor that any defects will be corrected.</p>
              <p className="uppercase text-white/60 text-xs tracking-wider mt-6">Limitation of Liability</p>
              <p>To the maximum extent permitted by law, éPure and its officers, employees, and affiliates shall not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, including loss of profits, revenue, data, goodwill, or business opportunities, arising out of or in connection with the Service or these Terms.</p>
              <p>Our total aggregate liability to you for any claim arising out of or relating to these Terms or the Service shall not exceed the <strong className="text-white/70">greater of (a) the fees you paid to éPure in the twelve (12) months preceding the claim, or (b) one hundred US Dollars ($100)</strong>.</p>
              <p>éPure is not liable for any loss, damage, injury, accident, or dispute arising from any rental activity between a Tenant and its End Users, or from any vehicle owned or operated by a Tenant.</p>
            </div>
          </div>

          {/* 11 */}
          <div id="indemnification" className="scroll-mt-24">
            <SectionHeading num={11}>Indemnification</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>You agree to indemnify, defend, and hold harmless éPure LLC and its officers, employees, and affiliates from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys&apos; fees) arising out of or related to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Your use of the Service or any Content you upload.</li>
                <li>Your violation of these Terms or of any applicable law.</li>
                <li>Any rental activity, agreement, or dispute between you and your End Users.</li>
                <li>Any claim that your use of the Service infringed a third-party right.</li>
              </ul>
            </div>
          </div>

          {/* 12 */}
          <div id="termination" className="scroll-mt-24">
            <SectionHeading num={12}>Termination</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>You may terminate your account at any time from your dashboard or by contacting <a href="mailto:info@epuredrive.com" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">info@epuredrive.com</a>. We may suspend or terminate your account immediately if you breach these Terms, if payment fails, or if we reasonably believe continued use poses a risk to the Service or to other users.</p>
              <p>Upon termination, your right to access the Service ends immediately. We will retain your Content for a reasonable period (typically <strong className="text-white/70">30 days</strong>) to allow you to export it, after which we may permanently delete it. Certain provisions of these Terms (including Intellectual Property, Disclaimers, Limitation of Liability, Indemnification, and Governing Law) survive termination.</p>
            </div>
          </div>

          {/* 13 */}
          <div id="governing" className="scroll-mt-24">
            <SectionHeading num={13}>Governing Law &amp; Disputes</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>These Terms are governed by the laws of the <strong className="text-white/70">State of Florida, USA</strong>, without regard to its conflict-of-law principles. You and éPure agree to submit to the exclusive jurisdiction of the state and federal courts located in <strong className="text-white/70">Miami-Dade County, Florida</strong> for any dispute arising out of or relating to these Terms or the Service.</p>
              <p>You agree to first contact us in good faith to resolve any dispute informally before commencing any legal action. Reach us at <a href="mailto:info@epuredrive.com" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">info@epuredrive.com</a>.</p>
              <p>We may update these Terms from time to time. Material changes will be communicated by email or via an in-app notice at least <strong className="text-white/70">14 days</strong> before they take effect. Continued use of the Service after changes take effect constitutes acceptance of the updated Terms.</p>
              <div className="bg-white/[0.03] border border-white/[0.06] border-l-2 border-l-white/20 rounded-r-lg p-4 mt-4">
                Questions about these Terms? Contact us at <a href="mailto:info@epuredrive.com" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">info@epuredrive.com</a>.
              </div>
            </div>
          </div>

          {/* Last updated */}
          <div className="pt-8 border-t border-white/[0.06]">
            <p className="text-xs text-white/20">
              Last updated: April 2026 · éPure LLC ·{' '}
              <a href="mailto:info@epuredrive.com" className="text-white/30 hover:text-white transition-colors">info@epuredrive.com</a>
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
