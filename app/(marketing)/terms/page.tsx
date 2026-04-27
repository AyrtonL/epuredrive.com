import type { Metadata } from 'next'
import Link from 'next/link'
import { isFreeLaunchMode } from '@/lib/plan/effective-plan'

const FREE_LAUNCH = isFreeLaunchMode()

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

const sections = [
  {
    id: 'definitions',
    title: 'Definitions',
    content: (
      <ul className="list-disc pl-5 space-y-2">
        <li><strong className="text-white">&ldquo;Service&rdquo;</strong> — the éPure Drive software platform, including the website, dashboard, APIs, and any related tools or features provided by éPure LLC.</li>
        <li><strong className="text-white">&ldquo;Tenant&rdquo;</strong> — a business or individual that creates an account to use the Service to operate a rental business.</li>
        <li><strong className="text-white">&ldquo;End User&rdquo;</strong> — a customer of a Tenant whose data is collected or stored by the Tenant through the Service (for example, a renter, driver, or guest).</li>
        <li><strong className="text-white">&ldquo;Subscription&rdquo;</strong> — a recurring paid plan granting the Tenant access to the Service.</li>
        <li><strong className="text-white">&ldquo;Content&rdquo;</strong> — any data, text, images, documents, or other materials uploaded to or created via the Service.</li>
      </ul>
    ),
  },
  {
    id: 'account',
    title: 'Account & Eligibility',
    content: (
      <>
        <p>To use the Service, you must be at least 18 years old and legally capable of entering into a binding contract. If you register on behalf of a business, you represent that you are authorized to bind that business to these Terms.</p>
        <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify us immediately at <a href="mailto:support@epuredrive.com" className="text-silver hover:text-white underline underline-offset-2 transition-colors">support@epuredrive.com</a> if you suspect any unauthorized access.</p>
        <p>You must provide accurate, complete, and current information and keep it up to date. We may suspend or terminate accounts that contain false, misleading, or incomplete information.</p>
      </>
    ),
  },
  {
    id: 'service',
    title: 'The Service',
    content: (
      <>
        <p>éPure provides a software platform that enables Tenants to manage fleet inventory, reservations, rental agreements, customer records, payments, invoices, digital signatures, and related operational workflows. The Service may include integrations with third-party providers (for example, Stripe for payment processing).</p>
        <p>The Service is provided on a subscription basis. Features available to a Tenant depend on the plan selected and may change over time as we add, improve, or retire functionality. We will make reasonable efforts to communicate material changes in advance.</p>
        <div className="glass rounded-xl p-4 mt-2">
          <strong className="text-white">éPure is a software provider only.</strong> We do not own vehicles, rent vehicles, hold vehicle insurance, collect security deposits, or act as a party to any rental agreement between a Tenant and its End Users.
        </div>
      </>
    ),
  },
  {
    id: 'plans',
    title: 'Plans, Billing & Refunds',
    content: (
      <>
        {FREE_LAUNCH && (
          <div className="glass rounded-xl p-4 mb-2 border border-emerald-500/20">
            <strong className="text-emerald-300">Free Launch period:</strong> <span className="text-silver">all paid features are currently available at no cost. Subscription pricing described below will take effect when the Free Launch period ends. Existing accounts will receive at least 30 days&apos; notice before any subscription fee is charged.</span>
          </div>
        )}
        <p>Subscriptions are billed in advance on a monthly or annual basis, depending on the plan selected at signup. Fees are communicated at signup and are exclusive of any applicable taxes, which you are responsible for paying.</p>
        <p>Payments are processed by <strong className="text-white">Stripe, Inc.</strong> By providing your payment information, you authorize us (via Stripe) to charge the applicable fees to your payment method on a recurring basis until your Subscription is cancelled.</p>
        <p>You may cancel your Subscription at any time from your dashboard. Cancellation will take effect at the end of the current billing period; you retain access to paid features until that date.</p>
        <p><strong className="text-white">Fees are non-refundable</strong> except where required by law. We do not provide pro-rated refunds for partial billing periods, unused features, or early cancellation.</p>
        <p>We may change our pricing at any time. Price changes will be communicated at least <strong className="text-white">30 days in advance</strong> and will take effect at the start of your next billing period. Continued use of the Service after a price change constitutes acceptance of the new price.</p>
        <p>If a payment fails, we may suspend or downgrade your account until the balance is resolved. Accounts more than 30 days past due may be terminated.</p>
      </>
    ),
  },
  {
    id: 'transaction-fees',
    title: 'Transaction Fees',
    content: (
      <>
        {FREE_LAUNCH && (
          <div className="glass rounded-xl p-4 mb-2 border border-emerald-500/20">
            <strong className="text-emerald-300">Free Launch period:</strong> <span className="text-silver">a flat <strong className="text-white">1%</strong> transaction fee applies to every account, regardless of plan. The plan-tiered table below describes the fee structure that will apply when the Free Launch period ends.</span>
          </div>
        )}
        <p>When a Tenant accepts online payments from End Users through the Service via Stripe Connect, éPure charges a <strong className="text-white">transaction fee</strong> on each successful payment. This fee is automatically deducted from the payment before the remaining amount is deposited into the Tenant&apos;s connected Stripe account.</p>
        <p>Transaction fee rates vary by Subscription plan:</p>
        <div className="glass rounded-xl p-4 mt-2 mb-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
                <th className="text-left pb-2">Plan</th>
                <th className="text-right pb-2">Transaction Fee</th>
              </tr>
            </thead>
            <tbody className="text-charcoal">
              <tr className="border-t border-white/[0.06]"><td className="py-2 text-white font-medium">Free</td><td className="py-2 text-right">2%</td></tr>
              <tr className="border-t border-white/[0.06]"><td className="py-2 text-white font-medium">Starter</td><td className="py-2 text-right">1.5%</td></tr>
              <tr className="border-t border-white/[0.06]"><td className="py-2 text-white font-medium">Pro</td><td className="py-2 text-right">1%</td></tr>
              <tr className="border-t border-white/[0.06]"><td className="py-2 text-white font-medium">Max</td><td className="py-2 text-right">0%</td></tr>
              <tr className="border-t border-white/[0.06]"><td className="py-2 text-white font-medium">Enterprise</td><td className="py-2 text-right">Custom</td></tr>
            </tbody>
          </table>
        </div>
        <p>Transaction fees are in addition to any fees charged by Stripe for payment processing (typically 2.9% + $0.30 per transaction). Stripe&apos;s processing fees are deducted separately by Stripe and are subject to Stripe&apos;s own terms.</p>
        <p>éPure reserves the right to adjust transaction fee rates with at least <strong className="text-white">30 days&apos; notice</strong>. Upgrading your plan takes effect immediately, and the lower transaction fee rate applies to all payments processed after the upgrade.</p>
        <p>Tenants who do not use the integrated online payment system (for example, those who collect payments directly outside the Service) are not subject to transaction fees.</p>
      </>
    ),
  },
  {
    id: 'tenant',
    title: 'Tenant Responsibilities',
    content: (
      <>
        <p>Tenants are solely responsible for all aspects of their own rental business, including but not limited to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Ownership, registration, maintenance, and roadworthiness of all vehicles.</li>
          <li>Obtaining and maintaining all required <strong className="text-white">licenses, permits, and insurance</strong> (commercial auto, liability, and any other coverage required by law or prudent business practice).</li>
          <li>All agreements, contracts, pricing, deposits, fees, damages, and disputes with their End Users.</li>
          <li>Compliance with all applicable federal, state, and local laws — including rental, consumer protection, tax collection, data protection, anti-discrimination, and accessibility laws.</li>
          <li>The accuracy, legality, and appropriateness of all Content uploaded to or stored within the Service (including fleet listings, pricing, photos, and rental agreement templates).</li>
          <li>Obtaining any required consents from their End Users to collect, store, or process End User data via the Service.</li>
        </ul>
        <div className="glass rounded-xl p-4 mt-2">
          <strong className="text-white">éPure disclaims all responsibility</strong> for any rental-related activity, vehicle condition, accident, injury, loss, or dispute arising between a Tenant and its End Users. The Tenant is the sole counterparty in all rental transactions.
        </div>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable Use',
    content: (
      <>
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
      </>
    ),
  },
  {
    id: 'end-user-data',
    title: 'End User Data',
    content: (
      <>
        <p>When a Tenant uses the Service to collect, store, or process information about its End Users, the <strong className="text-white">Tenant is the data controller</strong> and <strong className="text-white">éPure acts only as a data processor</strong> on the Tenant&apos;s behalf.</p>
        <p>Tenants must:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Have a lawful basis to collect and process End User data.</li>
          <li>Provide their End Users with a privacy notice that explains how data is used, stored, and shared.</li>
          <li>Honor End User rights (access, rectification, deletion, portability) as required by applicable law (for example, GDPR, CCPA).</li>
          <li>Not upload sensitive categories of data (such as payment card numbers, government ID numbers, or health data) beyond what is strictly necessary to operate their rental business.</li>
        </ul>
        <p>éPure will process End User data only as described in our <Link href="/privacy" className="text-silver hover:text-white underline underline-offset-2 transition-colors">Privacy Policy</Link> and in accordance with the Tenant&apos;s instructions.</p>
      </>
    ),
  },
  {
    id: 'ip',
    title: 'Intellectual Property',
    content: (
      <>
        <p>The Service, including its software, design, trademarks, logos, and documentation, is owned by éPure LLC and is protected by intellectual property laws. We grant you a limited, non-exclusive, non-transferable, revocable license to use the Service in accordance with these Terms.</p>
        <p>You retain ownership of the Content you upload to the Service. By uploading Content, you grant éPure a worldwide, royalty-free license to host, store, process, display, and transmit that Content solely as necessary to provide the Service and to operate, maintain, and improve it.</p>
        <p>We welcome feedback and suggestions. If you send us feedback, you grant us a perpetual, irrevocable, royalty-free license to use it without restriction or compensation.</p>
      </>
    ),
  },
  {
    id: 'availability',
    title: 'Service Availability & Support',
    content: (
      <>
        <p>We strive to keep the Service available at all times, but we do not guarantee uninterrupted access. The Service may be temporarily unavailable due to scheduled maintenance, infrastructure issues, third-party provider outages, or events beyond our reasonable control.</p>
        <p>Support is provided via <a href="mailto:support@epuredrive.com" className="text-silver hover:text-white underline underline-offset-2 transition-colors">support@epuredrive.com</a> and via the in-app support form. Response times and support scope depend on your plan.</p>
      </>
    ),
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers & Limitation of Liability',
    content: (
      <>
        <p className="uppercase text-silver text-xs tracking-wider font-bold">Disclaimer of Warranties</p>
        <p>The Service is provided <strong className="text-white">&ldquo;as is&rdquo;</strong> and <strong className="text-white">&ldquo;as available&rdquo;</strong> without warranties of any kind, whether express, implied, or statutory. To the maximum extent permitted by law, éPure disclaims all warranties, including warranties of merchantability, fitness for a particular purpose, title, non-infringement, and any warranty arising from course of dealing or usage of trade.</p>
        <p>We do not warrant that the Service will be uninterrupted, error-free, secure, or free of viruses or harmful code, nor that any defects will be corrected.</p>
        <p className="uppercase text-silver text-xs tracking-wider font-bold mt-6">Limitation of Liability</p>
        <p>To the maximum extent permitted by law, éPure and its officers, employees, and affiliates shall not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, including loss of profits, revenue, data, goodwill, or business opportunities, arising out of or in connection with the Service or these Terms.</p>
        <p>Our total aggregate liability to you for any claim arising out of or relating to these Terms or the Service shall not exceed the <strong className="text-white">greater of (a) the fees you paid to éPure in the twelve (12) months preceding the claim, or (b) one hundred US Dollars ($100)</strong>.</p>
        <p>éPure is not liable for any loss, damage, injury, accident, or dispute arising from any rental activity between a Tenant and its End Users, or from any vehicle owned or operated by a Tenant.</p>
      </>
    ),
  },
  {
    id: 'indemnification',
    title: 'Indemnification',
    content: (
      <>
        <p>You agree to indemnify, defend, and hold harmless éPure LLC and its officers, employees, and affiliates from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys&apos; fees) arising out of or related to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Your use of the Service or any Content you upload.</li>
          <li>Your violation of these Terms or of any applicable law.</li>
          <li>Any rental activity, agreement, or dispute between you and your End Users.</li>
          <li>Any claim that your use of the Service infringed a third-party right.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'termination',
    title: 'Termination',
    content: (
      <>
        <p>You may terminate your account at any time from your dashboard or by contacting <a href="mailto:support@epuredrive.com" className="text-silver hover:text-white underline underline-offset-2 transition-colors">support@epuredrive.com</a>. We may suspend or terminate your account immediately if you breach these Terms, if payment fails, or if we reasonably believe continued use poses a risk to the Service or to other users.</p>
        <p>Upon termination, your right to access the Service ends immediately. We will retain your Content for a reasonable period (typically <strong className="text-white">30 days</strong>) to allow you to export it, after which we may permanently delete it. Certain provisions of these Terms (including Intellectual Property, Disclaimers, Limitation of Liability, Indemnification, and Governing Law) survive termination.</p>
      </>
    ),
  },
  {
    id: 'governing',
    title: 'Governing Law & Disputes',
    content: (
      <>
        <p>These Terms are governed by the laws of the <strong className="text-white">State of Florida, USA</strong>, without regard to its conflict-of-law principles. You and éPure agree to submit to the exclusive jurisdiction of the state and federal courts located in <strong className="text-white">Miami-Dade County, Florida</strong> for any dispute arising out of or relating to these Terms or the Service.</p>
        <p>You agree to first contact us in good faith to resolve any dispute informally before commencing any legal action. Reach us at <a href="mailto:support@epuredrive.com" className="text-silver hover:text-white underline underline-offset-2 transition-colors">support@epuredrive.com</a>.</p>
        <p>We may update these Terms from time to time. Material changes will be communicated by email or via an in-app notice at least <strong className="text-white">14 days</strong> before they take effect. Continued use of the Service after changes take effect constitutes acceptance of the updated Terms.</p>
      </>
    ),
  },
]

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
          Terms of Service
        </h1>
        <p className="text-charcoal text-lg max-w-xl mx-auto">
          Last updated: April 2026
        </p>
      </div>

      {/* Intro */}
      <div className="glass rounded-2xl p-6 mb-12 text-sm text-charcoal leading-relaxed">
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the éPure Drive software platform provided by <strong className="text-white">éPure LLC</strong> (&ldquo;éPure&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). éPure Drive is a software-as-a-service platform that enables rental businesses (&ldquo;Tenants&rdquo;) to manage their fleet, bookings, customers, and operations. <strong className="text-white">éPure does not own, rent, insure, or operate vehicles.</strong> All rental transactions and vehicle-related obligations are between each Tenant and its own customers. By creating an account or using the Service, you agree to these Terms.
      </div>

      {/* TOC */}
      <nav className="glass rounded-2xl p-6 mb-12">
        <h3 className="text-xs font-black text-white/30 uppercase tracking-[0.2em] mb-4">
          Table of Contents
        </h3>
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-charcoal">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="hover:text-white transition-colors">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Sections */}
      <div className="space-y-10">
        {sections.map((section, i) => (
          <div key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="text-xs font-black text-white/30 uppercase tracking-[0.2em] mb-6 pl-1">
              {i + 1}. {section.title}
            </h2>
            <div className="glass rounded-2xl p-6">
              <div className="text-sm text-charcoal leading-relaxed space-y-3">
                {section.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-white/[0.06] text-center">
        <p className="text-charcoal/60 text-xs">
          Questions? Contact us at{' '}
          <a href="mailto:support@epuredrive.com" className="text-charcoal hover:text-white transition-colors">
            support@epuredrive.com
          </a>
        </p>
        <p className="text-charcoal/40 text-xs mt-2">
          éPure LLC · Miami, Florida
        </p>
      </div>
    </div>
  )
}
