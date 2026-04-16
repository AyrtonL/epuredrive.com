import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — éPure Drive',
  description:
    'Privacy Policy for the éPure Drive software platform — what we collect, how we use it, sub-processors, and your rights under GDPR and CCPA.',
  alternates: { canonical: 'https://epuredrive.com/privacy' },
  openGraph: {
    title: 'Privacy Policy — éPure Drive',
    description:
      'Privacy Policy for the éPure Drive software platform — what we collect, how we use it, sub-processors, and your rights under GDPR and CCPA.',
    url: 'https://epuredrive.com/privacy',
  },
}

const sections = [
  {
    id: 'scope',
    title: 'Scope & Our Role',
    content: (
      <>
        <p>This Privacy Policy applies to personal data that we collect as a <strong className="text-white">data controller</strong>, such as:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Visitors to our public website.</li>
          <li>Tenants who register for an account and use the Service.</li>
          <li>People who contact us (for example, via email or support forms).</li>
        </ul>
        <p>When Tenants use the Service to collect or store information about their own customers (&ldquo;End Users&rdquo;), the Tenant is the data controller for that information and éPure acts as a <strong className="text-white">data processor</strong> on the Tenant&apos;s behalf. End Users with questions about how a Tenant handles their data should contact the Tenant directly.</p>
      </>
    ),
  },
  {
    id: 'what-we-collect',
    title: 'Information We Collect',
    content: (
      <>
        <p><strong className="text-white">Account information:</strong> name, email address, business name, password hash, and role (for example, admin, staff).</p>
        <p><strong className="text-white">Billing information:</strong> subscription plan, invoice history, and the last four digits of your payment card. Full card details are handled by Stripe and are never stored on our servers.</p>
        <p><strong className="text-white">Usage data:</strong> pages visited, features used, timestamps, IP address, browser type, device type, and operating system. This data helps us understand how the Service is used and improve it.</p>
        <p><strong className="text-white">Support communications:</strong> messages you send us via email, chat, or support forms, along with any attachments.</p>
        <p><strong className="text-white">Cookies &amp; similar technologies:</strong> see Section 6 and our <Link href="/cookies" className="text-silver hover:text-white underline underline-offset-2 transition-colors">Cookie Policy</Link>.</p>
      </>
    ),
  },
  {
    id: 'end-user-data',
    title: 'End User Data Stored by Tenants',
    content: (
      <>
        <p>Tenants may upload or store information about their End Users via the Service, such as customer names, contact details, driver&apos;s license information, rental history, and signed rental agreements.</p>
        <p>éPure processes this information solely on the instructions of the Tenant and only as necessary to provide the Service. We do not sell, rent, or use End User data for our own marketing purposes.</p>
        <p>If you are an End User and want to exercise a right over your data (access, correction, deletion, etc.), please contact the Tenant that collected your data. We will cooperate with the Tenant to honor valid requests.</p>
      </>
    ),
  },
  {
    id: 'how-we-use',
    title: 'How We Use Information',
    content: (
      <>
        <p>We use the information we collect to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Provide, operate, and maintain the Service.</li>
          <li>Process subscriptions, payments, and invoices.</li>
          <li>Send transactional emails (welcome, billing, password reset, support replies, product notices).</li>
          <li>Respond to support requests and troubleshoot issues.</li>
          <li>Monitor usage, prevent abuse, and secure the Service.</li>
          <li>Improve the Service and develop new features.</li>
          <li>Comply with legal obligations and enforce our <Link href="/terms" className="text-silver hover:text-white underline underline-offset-2 transition-colors">Terms of Service</Link>.</li>
        </ul>
        <p>We do not sell your personal data. We do not use your data to train third-party AI models.</p>
      </>
    ),
  },
  {
    id: 'legal-basis',
    title: 'Legal Basis for Processing',
    content: (
      <>
        <p>Where applicable law (such as the EU or UK GDPR) requires us to identify a legal basis, we rely on the following:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong className="text-white">Contract:</strong> to provide the Service, process payments, and fulfill our obligations under the Terms of Service.</li>
          <li><strong className="text-white">Legitimate interests:</strong> to secure the Service, prevent fraud, improve our product, and run our business — balanced against your interests and rights.</li>
          <li><strong className="text-white">Consent:</strong> for non-essential cookies and analytics, and for any optional marketing communications.</li>
          <li><strong className="text-white">Legal obligation:</strong> to comply with accounting, tax, and other legal requirements.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies & Analytics',
    content: (
      <>
        <p>We use cookies and similar technologies for the following purposes:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong className="text-white">Essential cookies:</strong> required to operate the Service (for example, to keep you signed in). These cannot be disabled.</li>
          <li><strong className="text-white">Analytics cookies:</strong> we use Google Analytics 4 to understand how visitors use our website (pages, sessions, events). Analytics are loaded only after you grant consent via our cookie banner.</li>
          <li><strong className="text-white">Preference cookies:</strong> to remember your preferences (for example, cookie consent choice).</li>
        </ul>
        <p>You can manage your cookie preferences at any time through the cookie banner on our website or through your browser settings. For a detailed list of all cookies we use, see our <Link href="/cookies" className="text-silver hover:text-white underline underline-offset-2 transition-colors">Cookie Policy</Link>.</p>
      </>
    ),
  },
  {
    id: 'sub-processors',
    title: 'Sub-processors',
    content: (
      <>
        <p>We rely on a small set of trusted third-party providers to operate the Service:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse mt-2">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-[10px] uppercase tracking-wider text-white/40 font-semibold py-2 pr-4">Provider</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-white/40 font-semibold py-2 pr-4">Purpose</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-white/40 font-semibold py-2">Location</th>
              </tr>
            </thead>
            <tbody className="text-charcoal">
              <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4">Supabase</td><td className="py-2 pr-4">Database, authentication, file storage</td><td className="py-2">USA</td></tr>
              <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4">Stripe</td><td className="py-2 pr-4">Payment processing, subscription billing</td><td className="py-2">USA / EU</td></tr>
              <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4">Resend</td><td className="py-2 pr-4">Transactional email delivery</td><td className="py-2">USA / EU</td></tr>
              <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4">Netlify</td><td className="py-2 pr-4">Website &amp; application hosting, CDN</td><td className="py-2">Global</td></tr>
              <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4">Upstash</td><td className="py-2 pr-4">Rate limiting, caching</td><td className="py-2">Global</td></tr>
              <tr><td className="py-2 pr-4">Google Analytics</td><td className="py-2 pr-4">Website usage analytics (with consent)</td><td className="py-2">Global</td></tr>
            </tbody>
          </table>
        </div>
        <p>We enter into data processing agreements with each sub-processor and require them to apply appropriate security and confidentiality safeguards.</p>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'Data Sharing & Disclosure',
    content: (
      <>
        <p>We do not sell your personal data. We share personal data only in the following limited circumstances:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong className="text-white">With sub-processors</strong> listed in Section 7, strictly to operate the Service.</li>
          <li><strong className="text-white">With your consent</strong> — for example, if you explicitly authorize an integration with a third-party tool.</li>
          <li><strong className="text-white">To comply with legal obligations</strong> — such as valid subpoenas, court orders, or government requests.</li>
          <li><strong className="text-white">To protect rights and safety</strong> — for example, to investigate fraud, abuse, or security incidents.</li>
          <li><strong className="text-white">In a business transfer</strong> — if éPure is involved in a merger, acquisition, or sale of assets, your data may be transferred as part of that transaction, subject to this Privacy Policy.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'Data Retention',
    content: (
      <>
        <p>We retain personal data for as long as necessary to provide the Service and to comply with our legal obligations.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong className="text-white">Account data:</strong> retained for the life of the account and for a reasonable period after account closure to allow recovery and to comply with legal/accounting obligations.</li>
          <li><strong className="text-white">Billing records:</strong> retained for at least <strong className="text-white">seven (7) years</strong> to comply with US tax and accounting rules.</li>
          <li><strong className="text-white">Support communications:</strong> retained for as long as needed to resolve issues and improve support quality.</li>
          <li><strong className="text-white">Analytics data:</strong> retained in aggregated form; individual records are deleted in line with the analytics provider&apos;s retention settings.</li>
        </ul>
        <p>You may request deletion of your account and associated data at any time, subject to the legal retention periods above.</p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Data Security',
    content: (
      <>
        <p>We apply technical and organizational measures designed to protect personal data against unauthorized access, alteration, disclosure, or destruction. These measures include:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Encryption in transit (TLS) and at rest.</li>
          <li>Row-level security on the database.</li>
          <li>Authentication, session management, and role-based access control.</li>
          <li>Rate limiting and abuse detection.</li>
          <li>Restricted administrative access on a need-to-know basis.</li>
        </ul>
        <p>No system is perfectly secure. If we become aware of a data breach that affects your personal data, we will notify you as required by applicable law.</p>
      </>
    ),
  },
  {
    id: 'transfers',
    title: 'International Transfers',
    content: (
      <p>éPure is based in the United States. If you access the Service from outside the US, your information may be transferred to, stored, and processed in the US and other countries where our sub-processors operate. Where required, we rely on appropriate transfer mechanisms (such as Standard Contractual Clauses) to protect your data.</p>
    ),
  },
  {
    id: 'rights',
    title: 'Your Rights (GDPR & CCPA)',
    content: (
      <>
        <p>Depending on your location, you may have the following rights over your personal data:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong className="text-white">Access</strong> — obtain a copy of the personal data we hold about you.</li>
          <li><strong className="text-white">Correction</strong> — request that inaccurate or incomplete data be corrected.</li>
          <li><strong className="text-white">Deletion</strong> — request that we delete your personal data, subject to legal retention requirements.</li>
          <li><strong className="text-white">Restriction</strong> — request that we limit the processing of your data.</li>
          <li><strong className="text-white">Portability</strong> — receive your data in a structured, machine-readable format.</li>
          <li><strong className="text-white">Objection</strong> — object to processing based on legitimate interests.</li>
          <li><strong className="text-white">Withdraw consent</strong> — where processing is based on consent, withdraw it at any time.</li>
          <li><strong className="text-white">Non-discrimination</strong> — we will not discriminate against you for exercising any privacy right.</li>
        </ul>
        <p>To exercise any of these rights, email us at <a href="mailto:support@epuredrive.com" className="text-silver hover:text-white underline underline-offset-2 transition-colors">support@epuredrive.com</a>. We may ask you to verify your identity before responding. You also have the right to lodge a complaint with your local data protection authority.</p>
      </>
    ),
  },
  {
    id: 'children',
    title: 'Children\'s Privacy',
    content: (
      <p>The Service is not directed to children under the age of 16, and we do not knowingly collect personal data from children. If you believe a child has provided us with personal information, please contact us and we will delete it.</p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes & Contact',
    content: (
      <>
        <p>We may update this Privacy Policy from time to time. Material changes will be communicated via email or via an in-app notice at least <strong className="text-white">14 days</strong> before they take effect. The &ldquo;Last updated&rdquo; date at the top of this page will always reflect the latest revision.</p>
        <p>For any questions, concerns, or data requests:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong className="text-white">Business:</strong> éPure LLC</li>
          <li><strong className="text-white">Phone:</strong> +1 (561) 546-1461</li>
          <li><strong className="text-white">Email:</strong> <a href="mailto:support@epuredrive.com" className="text-silver hover:text-white underline underline-offset-2 transition-colors">support@epuredrive.com</a></li>
        </ul>
        <p className="mt-4">See also our <Link href="/terms" className="text-silver hover:text-white underline underline-offset-2 transition-colors">Terms of Service</Link> and <Link href="/cookies" className="text-silver hover:text-white underline underline-offset-2 transition-colors">Cookie Policy</Link>.</p>
      </>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
          Privacy Policy
        </h1>
        <p className="text-charcoal text-lg max-w-xl mx-auto">
          Last updated: April 2026
        </p>
      </div>

      {/* Intro */}
      <div className="glass rounded-2xl p-6 mb-12 text-sm text-charcoal leading-relaxed">
        This Privacy Policy explains how <strong className="text-white">éPure LLC</strong> (&ldquo;éPure&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) collects, uses, and protects personal information when you visit <Link href="/" className="text-silver hover:text-white underline underline-offset-2 transition-colors">epuredrive.com</Link>, create an account, or use the éPure Drive software platform (the &ldquo;Service&rdquo;). éPure Drive is a software-as-a-service platform for rental businesses. This policy applies to information we collect <strong className="text-white">directly</strong> as the data controller. Information that our customers (&ldquo;Tenants&rdquo;) upload to the Service about their own customers is governed by the Tenant&apos;s own privacy policy; in that context éPure acts only as a data processor.
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
