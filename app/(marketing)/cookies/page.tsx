import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Cookie Policy — éPure Drive',
  description:
    'Cookie Policy for the éPure Drive software platform — what cookies we use, why, and how to manage your preferences.',
  alternates: { canonical: 'https://epuredrive.com/cookies' },
  openGraph: {
    title: 'Cookie Policy — éPure Drive',
    description:
      'Cookie Policy for the éPure Drive software platform — what cookies we use, why, and how to manage your preferences.',
    url: 'https://epuredrive.com/cookies',
  },
}

function CookieTable({ rows }: { rows: { name: string; provider: string; purpose: string; duration: string }[] }) {
  return (
    <div className="overflow-x-auto mt-3">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left text-[10px] uppercase tracking-wider text-white/40 font-semibold py-2 pr-4">Cookie</th>
            <th className="text-left text-[10px] uppercase tracking-wider text-white/40 font-semibold py-2 pr-4">Provider</th>
            <th className="text-left text-[10px] uppercase tracking-wider text-white/40 font-semibold py-2 pr-4">Purpose</th>
            <th className="text-left text-[10px] uppercase tracking-wider text-white/40 font-semibold py-2">Duration</th>
          </tr>
        </thead>
        <tbody className="text-charcoal">
          {rows.map((row, i) => (
            <tr key={row.name} className={i < rows.length - 1 ? 'border-b border-white/[0.04]' : ''}>
              <td className="py-2 pr-4 font-mono text-silver text-[11px]">{row.name}</td>
              <td className="py-2 pr-4">{row.provider}</td>
              <td className="py-2 pr-4">{row.purpose}</td>
              <td className="py-2">{row.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const sections = [
  {
    id: 'what-are-cookies',
    title: 'What Are Cookies?',
    content: (
      <>
        <p>Cookies are small text files that are placed on your device (computer, tablet, or phone) when you visit a website. They are widely used to make websites work efficiently, provide a better user experience, and supply information to site owners.</p>
        <p>We also use similar technologies such as <strong className="text-white">localStorage</strong> and <strong className="text-white">tracking pixels</strong> for the same purposes described in this policy. References to &ldquo;cookies&rdquo; in this document include these similar technologies.</p>
      </>
    ),
  },
  {
    id: 'categories',
    title: 'Categories of Cookies We Use',
    content: (
      <>
        <p>We group cookies into the following categories:</p>

        <div className="glass rounded-xl p-4 mt-3 space-y-3">
          <h3 className="text-sm font-bold text-white">Essential Cookies</h3>
          <p>These cookies are strictly necessary for the website to function. They cannot be switched off. They are usually set in response to actions you take, such as logging in, filling in forms, or setting privacy preferences.</p>
          <CookieTable rows={[
            { name: 'sb-*-auth-token', provider: 'Supabase', purpose: 'Authentication session', duration: 'Session / 1 year' },
            { name: 'cookie_consent', provider: 'éPure Drive', purpose: 'Stores your cookie preference', duration: '1 year' },
            { name: 'epure_cookie_consent', provider: 'éPure Drive', purpose: 'Cookie preference (tenant sites)', duration: '1 year' },
          ]} />
        </div>

        <div className="glass rounded-xl p-4 mt-3 space-y-3">
          <h3 className="text-sm font-bold text-white">Analytics Cookies</h3>
          <p>These cookies help us understand how visitors interact with the website by collecting and reporting information anonymously. They are only loaded after you grant consent via our cookie banner.</p>
          <CookieTable rows={[
            { name: '_ga', provider: 'Google Analytics', purpose: 'Distinguishes unique visitors', duration: '2 years' },
            { name: '_ga_*', provider: 'Google Analytics', purpose: 'Maintains session state', duration: '2 years' },
            { name: '_gid', provider: 'Google Analytics', purpose: 'Distinguishes users', duration: '24 hours' },
          ]} />
        </div>

        <div className="glass rounded-xl p-4 mt-3 space-y-3">
          <h3 className="text-sm font-bold text-white">Marketing Cookies</h3>
          <p>These cookies are used to deliver advertisements relevant to you and to measure the effectiveness of advertising campaigns. They are only loaded after you grant consent.</p>
          <CookieTable rows={[
            { name: '_gcl_*', provider: 'Google Ads', purpose: 'Conversion tracking', duration: '90 days' },
            { name: '_fbp', provider: 'Meta (Facebook)', purpose: 'Ad delivery and measurement', duration: '90 days' },
            { name: '_fbc', provider: 'Meta (Facebook)', purpose: 'Click attribution', duration: '90 days' },
          ]} />
        </div>
      </>
    ),
  },
  {
    id: 'manage',
    title: 'How to Manage Cookies',
    content: (
      <>
        <p>When you first visit our website, a cookie banner will ask for your consent. You can choose to accept or decline non-essential cookies.</p>
        <p><strong className="text-white">Change your preference:</strong> You can change your cookie preference at any time by clearing your browser&apos;s cookies and localStorage for this site. On your next visit the banner will appear again.</p>
        <p><strong className="text-white">Browser settings:</strong> Most browsers allow you to block or delete cookies through their settings. Note that blocking essential cookies may prevent parts of the website from functioning correctly.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-silver hover:text-white underline underline-offset-2 transition-colors">Chrome</a></li>
          <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-silver hover:text-white underline underline-offset-2 transition-colors">Firefox</a></li>
          <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-silver hover:text-white underline underline-offset-2 transition-colors">Safari</a></li>
          <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-silver hover:text-white underline underline-offset-2 transition-colors">Edge</a></li>
        </ul>
      </>
    ),
  },
  {
    id: 'dnt',
    title: 'Do Not Track & Global Privacy Control',
    content: (
      <p>Some browsers send a &ldquo;Do Not Track&rdquo; (DNT) or &ldquo;Global Privacy Control&rdquo; (GPC) signal. We treat GPC signals as a valid opt-out of the sale or sharing of personal information under the CCPA. When we detect a GPC signal, we do not load analytics or marketing cookies for that visitor.</p>
    ),
  },
  {
    id: 'third-party',
    title: 'Third-Party Cookies',
    content: (
      <>
        <p>Some cookies are placed by third-party services that appear on our pages. We do not control these cookies. For more information, see the privacy policies of:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-silver hover:text-white underline underline-offset-2 transition-colors">Google (Analytics &amp; Ads)</a></li>
          <li><a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer" className="text-silver hover:text-white underline underline-offset-2 transition-colors">Meta (Facebook Pixel)</a></li>
          <li><a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-silver hover:text-white underline underline-offset-2 transition-colors">Stripe (Payments)</a></li>
        </ul>
      </>
    ),
  },
  {
    id: 'updates',
    title: 'Updates to This Policy',
    content: (
      <p>We may update this Cookie Policy from time to time — for example, when we add new cookies or adopt new tracking technologies. The &ldquo;Last updated&rdquo; date at the top reflects the latest revision. Material changes will be communicated in line with our <Link href="/privacy" className="text-silver hover:text-white underline underline-offset-2 transition-colors">Privacy Policy</Link>.</p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    content: (
      <>
        <p>If you have questions about our use of cookies, contact us at <a href="mailto:support@epuredrive.com" className="text-silver hover:text-white underline underline-offset-2 transition-colors">support@epuredrive.com</a>.</p>
        <p>See also our <Link href="/privacy" className="text-silver hover:text-white underline underline-offset-2 transition-colors">Privacy Policy</Link> and <Link href="/terms" className="text-silver hover:text-white underline underline-offset-2 transition-colors">Terms of Service</Link>.</p>
      </>
    ),
  },
]

export default function CookiePolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
          Cookie Policy
        </h1>
        <p className="text-charcoal text-lg max-w-xl mx-auto">
          Last updated: April 2026
        </p>
      </div>

      {/* Intro */}
      <div className="glass rounded-2xl p-6 mb-12 text-sm text-charcoal leading-relaxed">
        This Cookie Policy explains how <strong className="text-white">éPure LLC</strong> (&ldquo;éPure&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) uses cookies and similar tracking technologies on <Link href="/" className="text-silver hover:text-white underline underline-offset-2 transition-colors">epuredrive.com</Link> and associated subdomains. This policy should be read together with our{' '}
        <Link href="/privacy" className="text-silver hover:text-white underline underline-offset-2 transition-colors">Privacy Policy</Link>.
      </div>

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
