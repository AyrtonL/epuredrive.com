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

export default function CookiePolicyPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-28 pb-12 border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-6">
          <span className="text-[11px] font-bold tracking-[0.3em] text-white/25 uppercase block mb-4">
            Legal
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
            Cookie Policy
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
            This Cookie Policy explains how <strong className="text-white/70">éPure LLC</strong> (&ldquo;éPure&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) uses cookies and similar tracking technologies on <Link href="/" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">epuredrive.com</Link> and associated subdomains. This policy should be read together with our{' '}
            <Link href="/privacy" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">Privacy Policy</Link>.
          </div>

          {/* 1 */}
          <div className="scroll-mt-24">
            <SectionHeading num={1}>What Are Cookies?</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>Cookies are small text files that are placed on your device (computer, tablet, or phone) when you visit a website. They are widely used to make websites work efficiently, provide a better user experience, and supply information to site owners.</p>
              <p>We also use similar technologies such as <strong className="text-white/70">localStorage</strong> and <strong className="text-white/70">tracking pixels</strong> for the same purposes described in this policy. References to &ldquo;cookies&rdquo; in this document include these similar technologies.</p>
            </div>
          </div>

          {/* 2 */}
          <div className="scroll-mt-24">
            <SectionHeading num={2}>Categories of Cookies We Use</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>We group cookies into the following categories:</p>

              {/* Essential */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mt-4 space-y-3">
                <h3 className="text-sm font-bold text-white/80">Essential Cookies</h3>
                <p>These cookies are strictly necessary for the website to function. They cannot be switched off. They are usually set in response to actions you take, such as logging in, filling in forms, or setting privacy preferences.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse mt-2">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-[10px] uppercase tracking-wider text-white/40 font-semibold py-2 pr-4">Cookie</th>
                        <th className="text-left text-[10px] uppercase tracking-wider text-white/40 font-semibold py-2 pr-4">Provider</th>
                        <th className="text-left text-[10px] uppercase tracking-wider text-white/40 font-semibold py-2 pr-4">Purpose</th>
                        <th className="text-left text-[10px] uppercase tracking-wider text-white/40 font-semibold py-2">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/50">
                      <tr className="border-b border-white/[0.04]">
                        <td className="py-2 pr-4 font-mono text-white/60">sb-*-auth-token</td>
                        <td className="py-2 pr-4">Supabase</td>
                        <td className="py-2 pr-4">Authentication session</td>
                        <td className="py-2">Session / 1 year</td>
                      </tr>
                      <tr className="border-b border-white/[0.04]">
                        <td className="py-2 pr-4 font-mono text-white/60">cookie_consent</td>
                        <td className="py-2 pr-4">éPure Drive</td>
                        <td className="py-2 pr-4">Stores your cookie preference</td>
                        <td className="py-2">1 year</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-mono text-white/60">epure_cookie_consent</td>
                        <td className="py-2 pr-4">éPure Drive</td>
                        <td className="py-2 pr-4">Stores cookie preference (tenant sites)</td>
                        <td className="py-2">1 year</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Analytics */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mt-4 space-y-3">
                <h3 className="text-sm font-bold text-white/80">Analytics Cookies</h3>
                <p>These cookies help us understand how visitors interact with the website by collecting and reporting information anonymously. They are only loaded after you grant consent via our cookie banner.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse mt-2">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-[10px] uppercase tracking-wider text-white/40 font-semibold py-2 pr-4">Cookie</th>
                        <th className="text-left text-[10px] uppercase tracking-wider text-white/40 font-semibold py-2 pr-4">Provider</th>
                        <th className="text-left text-[10px] uppercase tracking-wider text-white/40 font-semibold py-2 pr-4">Purpose</th>
                        <th className="text-left text-[10px] uppercase tracking-wider text-white/40 font-semibold py-2">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/50">
                      <tr className="border-b border-white/[0.04]">
                        <td className="py-2 pr-4 font-mono text-white/60">_ga</td>
                        <td className="py-2 pr-4">Google Analytics</td>
                        <td className="py-2 pr-4">Distinguishes unique visitors</td>
                        <td className="py-2">2 years</td>
                      </tr>
                      <tr className="border-b border-white/[0.04]">
                        <td className="py-2 pr-4 font-mono text-white/60">_ga_*</td>
                        <td className="py-2 pr-4">Google Analytics</td>
                        <td className="py-2 pr-4">Maintains session state</td>
                        <td className="py-2">2 years</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-mono text-white/60">_gid</td>
                        <td className="py-2 pr-4">Google Analytics</td>
                        <td className="py-2 pr-4">Distinguishes users</td>
                        <td className="py-2">24 hours</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Marketing */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mt-4 space-y-3">
                <h3 className="text-sm font-bold text-white/80">Marketing Cookies</h3>
                <p>These cookies are used to deliver advertisements relevant to you and to measure the effectiveness of advertising campaigns. They are only loaded after you grant consent.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse mt-2">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-[10px] uppercase tracking-wider text-white/40 font-semibold py-2 pr-4">Cookie</th>
                        <th className="text-left text-[10px] uppercase tracking-wider text-white/40 font-semibold py-2 pr-4">Provider</th>
                        <th className="text-left text-[10px] uppercase tracking-wider text-white/40 font-semibold py-2 pr-4">Purpose</th>
                        <th className="text-left text-[10px] uppercase tracking-wider text-white/40 font-semibold py-2">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/50">
                      <tr className="border-b border-white/[0.04]">
                        <td className="py-2 pr-4 font-mono text-white/60">_gcl_*</td>
                        <td className="py-2 pr-4">Google Ads</td>
                        <td className="py-2 pr-4">Conversion tracking</td>
                        <td className="py-2">90 days</td>
                      </tr>
                      <tr className="border-b border-white/[0.04]">
                        <td className="py-2 pr-4 font-mono text-white/60">_fbp</td>
                        <td className="py-2 pr-4">Meta (Facebook)</td>
                        <td className="py-2 pr-4">Ad delivery and measurement</td>
                        <td className="py-2">90 days</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-mono text-white/60">_fbc</td>
                        <td className="py-2 pr-4">Meta (Facebook)</td>
                        <td className="py-2 pr-4">Click attribution</td>
                        <td className="py-2">90 days</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* 3 */}
          <div className="scroll-mt-24">
            <SectionHeading num={3}>How to Manage Cookies</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>When you first visit our website, a cookie banner will ask for your consent. You can choose to accept or decline non-essential cookies.</p>
              <p><strong className="text-white/70">Change your preference:</strong> You can change your cookie preference at any time by clearing your browser&apos;s cookies and localStorage for this site. On your next visit the banner will appear again.</p>
              <p><strong className="text-white/70">Browser settings:</strong> Most browsers allow you to block or delete cookies through their settings. Note that blocking essential cookies may prevent parts of the website from functioning correctly.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">Chrome</a></li>
                <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">Firefox</a></li>
                <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">Safari</a></li>
                <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">Edge</a></li>
              </ul>
            </div>
          </div>

          {/* 4 */}
          <div className="scroll-mt-24">
            <SectionHeading num={4}>Do Not Track &amp; Global Privacy Control</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>Some browsers send a &ldquo;Do Not Track&rdquo; (DNT) or &ldquo;Global Privacy Control&rdquo; (GPC) signal. We treat GPC signals as a valid opt-out of the sale or sharing of personal information under the CCPA. When we detect a GPC signal, we do not load analytics or marketing cookies for that visitor.</p>
            </div>
          </div>

          {/* 5 */}
          <div className="scroll-mt-24">
            <SectionHeading num={5}>Third-Party Cookies</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>Some cookies are placed by third-party services that appear on our pages. We do not control these cookies. For more information, see the privacy policies of:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">Google (Analytics &amp; Ads)</a></li>
                <li><a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">Meta (Facebook Pixel)</a></li>
                <li><a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">Stripe (Payments)</a></li>
              </ul>
            </div>
          </div>

          {/* 6 */}
          <div className="scroll-mt-24">
            <SectionHeading num={6}>Updates to This Policy</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>We may update this Cookie Policy from time to time — for example, when we add new cookies or adopt new tracking technologies. The &ldquo;Last updated&rdquo; date at the top reflects the latest revision. Material changes will be communicated in line with our <Link href="/privacy" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">Privacy Policy</Link>.</p>
            </div>
          </div>

          {/* 7 */}
          <div className="scroll-mt-24">
            <SectionHeading num={7}>Contact</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>If you have questions about our use of cookies, contact us at:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong className="text-white/70">Email:</strong>{' '}
                  <a href="mailto:support@epuredrive.com" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">support@epuredrive.com</a>
                </li>
              </ul>
              <p className="mt-4">
                See also our{' '}
                <Link href="/privacy" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">Privacy Policy</Link>{' '}and{' '}
                <Link href="/terms" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">Terms of Service</Link>.
              </p>
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
