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

export default function PrivacyPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-28 pb-12 border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-6">
          <span className="text-[11px] font-bold tracking-[0.3em] text-white/25 uppercase block mb-4">
            Legal
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
            Privacy Policy
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
            This Privacy Policy explains how <strong className="text-white/70">éPure LLC</strong> (&ldquo;éPure&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) collects, uses, and protects personal information when you visit <Link href="/" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">epuredrive.com</Link>, create an account, or use the éPure Drive software platform (the &ldquo;Service&rdquo;). éPure Drive is a software-as-a-service platform for rental businesses. This policy applies to information we collect <strong className="text-white/70">directly</strong> as the data controller. Information that our customers (&ldquo;Tenants&rdquo;) upload to the Service about their own customers is governed by the Tenant&apos;s own privacy policy; in that context éPure acts only as a data processor.
          </div>

          {/* TOC */}
          <nav className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
            <h3 className="text-[11px] font-bold tracking-[0.2em] text-white/40 uppercase mb-4">
              Table of Contents
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 text-sm text-white/50">
              <li><a href="#scope" className="hover:text-white transition-colors">Scope &amp; Our Role</a></li>
              <li><a href="#what-we-collect" className="hover:text-white transition-colors">Information We Collect</a></li>
              <li><a href="#end-user-data" className="hover:text-white transition-colors">End User Data Stored by Tenants</a></li>
              <li><a href="#how-we-use" className="hover:text-white transition-colors">How We Use Information</a></li>
              <li><a href="#legal-basis" className="hover:text-white transition-colors">Legal Basis for Processing</a></li>
              <li><a href="#cookies" className="hover:text-white transition-colors">Cookies &amp; Analytics</a></li>
              <li><a href="#sub-processors" className="hover:text-white transition-colors">Sub-processors</a></li>
              <li><a href="#sharing" className="hover:text-white transition-colors">Data Sharing &amp; Disclosure</a></li>
              <li><a href="#retention" className="hover:text-white transition-colors">Data Retention</a></li>
              <li><a href="#security" className="hover:text-white transition-colors">Data Security</a></li>
              <li><a href="#transfers" className="hover:text-white transition-colors">International Transfers</a></li>
              <li><a href="#rights" className="hover:text-white transition-colors">Your Rights (GDPR &amp; CCPA)</a></li>
              <li><a href="#children" className="hover:text-white transition-colors">Children&apos;s Privacy</a></li>
              <li><a href="#changes" className="hover:text-white transition-colors">Changes &amp; Contact</a></li>
            </ol>
          </nav>

          {/* 1 */}
          <div id="scope" className="scroll-mt-24">
            <SectionHeading num={1}>Scope &amp; Our Role</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>This Privacy Policy applies to personal data that we collect as a <strong className="text-white/70">data controller</strong>, such as:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Visitors to our public website.</li>
                <li>Tenants who register for an account and use the Service.</li>
                <li>People who contact us (for example, via email or support forms).</li>
              </ul>
              <p>When Tenants use the Service to collect or store information about their own customers (&ldquo;End Users&rdquo;), the Tenant is the data controller for that information and éPure acts as a <strong className="text-white/70">data processor</strong> on the Tenant&apos;s behalf. End Users with questions about how a Tenant handles their data should contact the Tenant directly.</p>
            </div>
          </div>

          {/* 2 */}
          <div id="what-we-collect" className="scroll-mt-24">
            <SectionHeading num={2}>Information We Collect</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p><strong className="text-white/70">Account information:</strong> name, email address, business name, password hash, and role (for example, admin, staff).</p>
              <p><strong className="text-white/70">Billing information:</strong> subscription plan, invoice history, and the last four digits of your payment card. Full card details are handled by Stripe and are never stored on our servers.</p>
              <p><strong className="text-white/70">Usage data:</strong> pages visited, features used, timestamps, IP address, browser type, device type, and operating system. This data helps us understand how the Service is used and improve it.</p>
              <p><strong className="text-white/70">Support communications:</strong> messages you send us via email, chat, or support forms, along with any attachments.</p>
              <p><strong className="text-white/70">Cookies &amp; similar technologies:</strong> see Section 6.</p>
            </div>
          </div>

          {/* 3 */}
          <div id="end-user-data" className="scroll-mt-24">
            <SectionHeading num={3}>End User Data Stored by Tenants</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>Tenants may upload or store information about their End Users via the Service, such as customer names, contact details, driver&apos;s license information, rental history, and signed rental agreements.</p>
              <p>éPure processes this information solely on the instructions of the Tenant and only as necessary to provide the Service. We do not sell, rent, or use End User data for our own marketing purposes.</p>
              <p>If you are an End User and want to exercise a right over your data (access, correction, deletion, etc.), please contact the Tenant that collected your data. We will cooperate with the Tenant to honor valid requests.</p>
            </div>
          </div>

          {/* 4 */}
          <div id="how-we-use" className="scroll-mt-24">
            <SectionHeading num={4}>How We Use Information</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Provide, operate, and maintain the Service.</li>
                <li>Process subscriptions, payments, and invoices.</li>
                <li>Send transactional emails (welcome, billing, password reset, support replies, product notices).</li>
                <li>Respond to support requests and troubleshoot issues.</li>
                <li>Monitor usage, prevent abuse, and secure the Service.</li>
                <li>Improve the Service and develop new features.</li>
                <li>Comply with legal obligations and enforce our <Link href="/terms" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">Terms of Service</Link>.</li>
              </ul>
              <p>We do not sell your personal data. We do not use your data to train third-party AI models.</p>
            </div>
          </div>

          {/* 5 */}
          <div id="legal-basis" className="scroll-mt-24">
            <SectionHeading num={5}>Legal Basis for Processing</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>Where applicable law (such as the EU or UK GDPR) requires us to identify a legal basis, we rely on the following:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-white/70">Contract:</strong> to provide the Service, process payments, and fulfill our obligations under the Terms of Service.</li>
                <li><strong className="text-white/70">Legitimate interests:</strong> to secure the Service, prevent fraud, improve our product, and run our business — balanced against your interests and rights.</li>
                <li><strong className="text-white/70">Consent:</strong> for non-essential cookies and analytics, and for any optional marketing communications.</li>
                <li><strong className="text-white/70">Legal obligation:</strong> to comply with accounting, tax, and other legal requirements.</li>
              </ul>
            </div>
          </div>

          {/* 6 */}
          <div id="cookies" className="scroll-mt-24">
            <SectionHeading num={6}>Cookies &amp; Analytics</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>We use cookies and similar technologies for the following purposes:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-white/70">Essential cookies:</strong> required to operate the Service (for example, to keep you signed in). These cannot be disabled.</li>
                <li><strong className="text-white/70">Analytics cookies:</strong> we use Google Analytics 4 to understand how visitors use our website (pages, sessions, events). Analytics are loaded only after you grant consent via our cookie banner.</li>
                <li><strong className="text-white/70">Preference cookies:</strong> to remember your preferences (for example, cookie consent choice).</li>
              </ul>
              <p>You can manage your cookie preferences at any time through the cookie banner on our website or through your browser settings. For a detailed list of all cookies we use, see our <Link href="/cookies" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">Cookie Policy</Link>.</p>
            </div>
          </div>

          {/* 7 */}
          <div id="sub-processors" className="scroll-mt-24">
            <SectionHeading num={7}>Sub-processors</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>We rely on a small set of trusted third-party providers to operate the Service. These sub-processors may process personal data on our behalf, and only for the purposes described below:</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse mt-2">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-[11px] uppercase tracking-wider text-white/40 font-semibold py-2 pr-4">Provider</th>
                      <th className="text-left text-[11px] uppercase tracking-wider text-white/40 font-semibold py-2 pr-4">Purpose</th>
                      <th className="text-left text-[11px] uppercase tracking-wider text-white/40 font-semibold py-2">Location</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/50">
                    <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4">Supabase</td><td className="py-2 pr-4">Database, authentication, file storage</td><td className="py-2">USA</td></tr>
                    <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4">Stripe</td><td className="py-2 pr-4">Payment processing, subscription billing</td><td className="py-2">USA / EU</td></tr>
                    <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4">Resend</td><td className="py-2 pr-4">Transactional email delivery</td><td className="py-2">USA / EU</td></tr>
                    <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4">Netlify</td><td className="py-2 pr-4">Website &amp; application hosting, CDN</td><td className="py-2">Global</td></tr>
                    <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4">Upstash</td><td className="py-2 pr-4">Rate limiting, caching</td><td className="py-2">Global</td></tr>
                    <tr><td className="py-2 pr-4">Google Analytics</td><td className="py-2 pr-4">Website usage analytics (with consent)</td><td className="py-2">Global</td></tr>
                  </tbody>
                </table>
              </div>
              <p>We enter into data processing agreements with each sub-processor and require them to apply appropriate security and confidentiality safeguards. We may update this list from time to time.</p>
            </div>
          </div>

          {/* 8 */}
          <div id="sharing" className="scroll-mt-24">
            <SectionHeading num={8}>Data Sharing &amp; Disclosure</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>We do not sell your personal data. We share personal data only in the following limited circumstances:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-white/70">With sub-processors</strong> listed in Section 7, strictly to operate the Service.</li>
                <li><strong className="text-white/70">With your consent</strong> — for example, if you explicitly authorize an integration with a third-party tool.</li>
                <li><strong className="text-white/70">To comply with legal obligations</strong> — such as valid subpoenas, court orders, or government requests.</li>
                <li><strong className="text-white/70">To protect rights and safety</strong> — for example, to investigate fraud, abuse, or security incidents.</li>
                <li><strong className="text-white/70">In a business transfer</strong> — if éPure is involved in a merger, acquisition, or sale of assets, your data may be transferred as part of that transaction, subject to this Privacy Policy.</li>
              </ul>
            </div>
          </div>

          {/* 9 */}
          <div id="retention" className="scroll-mt-24">
            <SectionHeading num={9}>Data Retention</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>We retain personal data for as long as necessary to provide the Service and to comply with our legal obligations.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-white/70">Account data:</strong> retained for the life of the account and for a reasonable period after account closure to allow recovery and to comply with legal/accounting obligations.</li>
                <li><strong className="text-white/70">Billing records:</strong> retained for at least <strong className="text-white/70">seven (7) years</strong> to comply with US tax and accounting rules.</li>
                <li><strong className="text-white/70">Support communications:</strong> retained for as long as needed to resolve issues and improve support quality.</li>
                <li><strong className="text-white/70">Analytics data:</strong> retained in aggregated form; individual records are deleted in line with the analytics provider&apos;s retention settings.</li>
              </ul>
              <p>You may request deletion of your account and associated data at any time, subject to the legal retention periods above.</p>
            </div>
          </div>

          {/* 10 */}
          <div id="security" className="scroll-mt-24">
            <SectionHeading num={10}>Data Security</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>We apply technical and organizational measures designed to protect personal data against unauthorized access, alteration, disclosure, or destruction. These measures include:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Encryption in transit (TLS) and at rest.</li>
                <li>Row-level security on the database.</li>
                <li>Authentication, session management, and role-based access control.</li>
                <li>Rate limiting and abuse detection.</li>
                <li>Restricted administrative access on a need-to-know basis.</li>
              </ul>
              <p>No system is perfectly secure. If we become aware of a data breach that affects your personal data, we will notify you as required by applicable law.</p>
            </div>
          </div>

          {/* 11 */}
          <div id="transfers" className="scroll-mt-24">
            <SectionHeading num={11}>International Transfers</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>éPure is based in the United States. If you access the Service from outside the US, your information may be transferred to, stored, and processed in the US and other countries where our sub-processors operate. Where required, we rely on appropriate transfer mechanisms (such as Standard Contractual Clauses) to protect your data.</p>
            </div>
          </div>

          {/* 12 */}
          <div id="rights" className="scroll-mt-24">
            <SectionHeading num={12}>Your Rights (GDPR &amp; CCPA)</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>Depending on your location, you may have the following rights over your personal data:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-white/70">Access</strong> — obtain a copy of the personal data we hold about you.</li>
                <li><strong className="text-white/70">Correction</strong> — request that inaccurate or incomplete data be corrected.</li>
                <li><strong className="text-white/70">Deletion</strong> — request that we delete your personal data, subject to legal retention requirements.</li>
                <li><strong className="text-white/70">Restriction</strong> — request that we limit the processing of your data.</li>
                <li><strong className="text-white/70">Portability</strong> — receive your data in a structured, machine-readable format.</li>
                <li><strong className="text-white/70">Objection</strong> — object to processing based on legitimate interests.</li>
                <li><strong className="text-white/70">Withdraw consent</strong> — where processing is based on consent, withdraw it at any time.</li>
                <li><strong className="text-white/70">Non-discrimination</strong> — we will not discriminate against you for exercising any privacy right.</li>
              </ul>
              <p>To exercise any of these rights, email us at <a href="mailto:info@epuredrive.com" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">info@epuredrive.com</a>. We may ask you to verify your identity before responding. You also have the right to lodge a complaint with your local data protection authority.</p>
            </div>
          </div>

          {/* 13 */}
          <div id="children" className="scroll-mt-24">
            <SectionHeading num={13}>Children&apos;s Privacy</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>The Service is not directed to children under the age of 16, and we do not knowingly collect personal data from children. If you believe a child has provided us with personal information, please contact us and we will delete it.</p>
            </div>
          </div>

          {/* 14 */}
          <div id="changes" className="scroll-mt-24">
            <SectionHeading num={14}>Changes &amp; Contact</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>We may update this Privacy Policy from time to time. Material changes will be communicated via email or via an in-app notice at least <strong className="text-white/70">14 days</strong> before they take effect. The &ldquo;Last updated&rdquo; date at the top of this page will always reflect the latest revision.</p>
              <p>For any questions, concerns, or data requests regarding this Privacy Policy:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong className="text-white/70">Business:</strong> éPure LLC</li>
                <li><strong className="text-white/70">Phone:</strong> +1 (561) 546-1461</li>
                <li><strong className="text-white/70">Email:</strong> <a href="mailto:info@epuredrive.com" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">info@epuredrive.com</a></li>
              </ul>
              <p className="mt-4">See also our <Link href="/terms" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">Terms of Service</Link>.</p>
            </div>
          </div>

          {/* Last updated */}
          <div className="pt-8 border-t border-white/[0.06]">
            <p className="text-xs text-white/20">
              Last updated: April 2026 · éPure LLC
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
