import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — éPure Drive',
  description: 'Privacy Policy for éPure Drive — how we collect, use, and protect your personal information.',
  alternates: { canonical: 'https://epuredrive.com/privacy' },
  openGraph: {
    title: 'Privacy Policy — éPure Drive',
    description: 'Privacy Policy for éPure Drive — how we collect, use, and protect your personal information.',
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
            Last updated: March 2026 · éPure Drive / Route 305 Rental Car · Aventura, Florida
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6 space-y-12">

          {/* Intro */}
          <div className="bg-white/[0.03] border border-white/[0.06] border-l-2 border-l-white/20 rounded-r-lg p-4 text-sm text-white/50 leading-relaxed">
            This Privacy Policy explains how éPure Drive (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) collects, uses, and protects your personal information when you visit our website or rent a vehicle from us. By using our services, you agree to the practices described below.
          </div>

          {/* TOC */}
          <nav className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
            <h3 className="text-[11px] font-bold tracking-[0.2em] text-white/40 uppercase mb-4">
              Contents
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 text-sm text-white/50">
              <li><a href="#information-we-collect" className="hover:text-white transition-colors">Information We Collect</a></li>
              <li><a href="#sensitive-data" className="hover:text-white transition-colors">Sensitive Information</a></li>
              <li><a href="#vehicle-gps" className="hover:text-white transition-colors">Vehicle Telematics &amp; GPS</a></li>
              <li><a href="#how-we-use" className="hover:text-white transition-colors">How We Use Your Information</a></li>
              <li><a href="#third-parties" className="hover:text-white transition-colors">Third-Party Services</a></li>
              <li><a href="#data-retention" className="hover:text-white transition-colors">Data Retention</a></li>
              <li><a href="#security" className="hover:text-white transition-colors">Data Security</a></li>
              <li><a href="#cookies" className="hover:text-white transition-colors">Cookies &amp; Analytics</a></li>
              <li><a href="#your-choices" className="hover:text-white transition-colors">Your Privacy Choices</a></li>
              <li><a href="#your-rights" className="hover:text-white transition-colors">Your Rights</a></li>
              <li><a href="#international" className="hover:text-white transition-colors">International Users &amp; Data Transfers</a></li>
              <li><a href="#external-links" className="hover:text-white transition-colors">External Links</a></li>
              <li><a href="#children" className="hover:text-white transition-colors">Children&apos;s Privacy</a></li>
              <li><a href="#changes" className="hover:text-white transition-colors">Changes to This Policy</a></li>
              <li><a href="#contact" className="hover:text-white transition-colors">Contact Us</a></li>
            </ol>
          </nav>

          {/* 1 */}
          <div id="information-we-collect" className="scroll-mt-24">
            <SectionHeading num={1}>Information We Collect</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>We collect information you provide directly when making a reservation or contacting us:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong className="text-white/70">Identity:</strong> Full name, date of birth.</li>
                <li><strong className="text-white/70">Contact:</strong> Email address, phone number.</li>
                <li><strong className="text-white/70">Driver&apos;s License:</strong> Issuing state or country, license number.</li>
                <li><strong className="text-white/70">Passport:</strong> Number and issuing country (international drivers only).</li>
                <li><strong className="text-white/70">Payment:</strong> Credit or debit card details, processed securely through Stripe. We do not store full card numbers.</li>
                <li><strong className="text-white/70">Booking details:</strong> Pick-up/return dates and times, location, vehicle selected, add-ons chosen.</li>
                <li><strong className="text-white/70">Communications:</strong> Messages sent via WhatsApp, email, or our website contact form.</li>
              </ul>
              <p>We also collect at the time of vehicle handover:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong className="text-white/70">Pick-up photos:</strong> Photographs of your driver&apos;s license, passport (if applicable), and the vehicle&apos;s condition.</li>
                <li><strong className="text-white/70">Drop-off photos:</strong> Photographs of the vehicle&apos;s condition upon return.</li>
              </ul>
              <p>We also collect limited technical data automatically when you visit our website:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>IP address, browser type, device type, and operating system.</li>
                <li>Pages visited and time spent on our website.</li>
                <li>Referring URL (the page that brought you to our site).</li>
              </ul>
            </div>
          </div>

          {/* 2 */}
          <div id="sensitive-data" className="scroll-mt-24">
            <SectionHeading num={2}>Sensitive Information</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>The following categories are considered sensitive and handled with additional care:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong className="text-white/70">Driver&apos;s license number</strong> — collected solely to verify driving eligibility.</li>
                <li><strong className="text-white/70">Passport number</strong> — collected from international drivers only to verify identity.</li>
                <li><strong className="text-white/70">Date of birth</strong> — collected to verify minimum age requirement.</li>
                <li><strong className="text-white/70">Payment card data</strong> — transmitted directly to Stripe; we never see or store full card numbers.</li>
              </ul>
              <p>We use sensitive information exclusively for processing your rental. It is <strong className="text-white/70">not</strong> used for profiling and is <strong className="text-white/70">not</strong> sold or shared with third parties for commercial purposes.</p>
            </div>
          </div>

          {/* 3 */}
          <div id="vehicle-gps" className="scroll-mt-24">
            <SectionHeading num={3}>Vehicle Telematics &amp; GPS</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>All vehicles in our fleet are equipped with GPS tracking devices. This data is used exclusively for:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong className="text-white/70">Stolen vehicle recovery.</strong></li>
                <li><strong className="text-white/70">Unauthorized use detection</strong> — to verify the vehicle is operated within the agreed rental territory.</li>
                <li><strong className="text-white/70">Emergency assistance</strong> — location data may be shared with emergency services in the event of an accident.</li>
              </ul>
              <div className="bg-white/[0.03] border border-white/[0.06] border-l-2 border-l-white/20 rounded-r-lg p-4 mt-4">
                GPS data is <strong className="text-white/70">not</strong> used for routine monitoring of your movements or shared with third parties for commercial purposes. Location history is retained only as long as necessary to resolve any disputes.
              </div>
            </div>
          </div>

          {/* 4 */}
          <div id="how-we-use" className="scroll-mt-24">
            <SectionHeading num={4}>How We Use Your Information</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Process and confirm your vehicle reservation.</li>
                <li>Verify driver eligibility and identity at pick-up.</li>
                <li>Document vehicle condition at pick-up and drop-off.</li>
                <li>Process payments and issue receipts.</li>
                <li>Communicate with you about your booking.</li>
                <li>Respond to your questions or support requests.</li>
                <li>Detect and prevent fraud or unauthorized use.</li>
                <li>Comply with legal obligations.</li>
                <li>Improve our website and services based on aggregated, anonymized usage data.</li>
              </ul>
              <p>We do <strong className="text-white/70">not</strong> sell, rent, or trade your personal information to third parties for marketing purposes.</p>
            </div>
          </div>

          {/* 5 */}
          <div id="third-parties" className="scroll-mt-24">
            <SectionHeading num={5}>Third-Party Services</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>To operate our business, we share limited data with the following trusted service providers:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong className="text-white/70">Stripe</strong> — payment processing.</li>
                <li><strong className="text-white/70">Supabase</strong> — secure cloud database hosted in the United States.</li>
                <li><strong className="text-white/70">Netlify</strong> — website hosting and serverless backend functions.</li>
                <li><strong className="text-white/70">Google</strong> — analytics and web fonts.</li>
                <li><strong className="text-white/70">WhatsApp / Meta</strong> — if you contact us via WhatsApp, your messages are subject to Meta&apos;s privacy policy.</li>
                <li><strong className="text-white/70">Law enforcement</strong> — we may disclose personal information when required by applicable law, court order, or governmental authority.</li>
              </ul>
            </div>
          </div>

          {/* 6 */}
          <div id="data-retention" className="scroll-mt-24">
            <SectionHeading num={6}>Data Retention</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>We retain your personal information for as long as necessary:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong className="text-white/70">Reservation records</strong> (including photos) are kept for a minimum of <strong className="text-white/70">5 years</strong>.</li>
                <li><strong className="text-white/70">Payment records</strong> are retained as required by Stripe and financial regulations.</li>
                <li><strong className="text-white/70">GPS/telematics data</strong> is retained for the rental duration plus up to 90 days.</li>
                <li><strong className="text-white/70">Newsletter subscriptions</strong> are retained until you unsubscribe.</li>
              </ul>
              <p>When data is no longer required, it is securely deleted or anonymized.</p>
            </div>
          </div>

          {/* 7 */}
          <div id="security" className="scroll-mt-24">
            <SectionHeading num={7}>Data Security</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>We implement industry-standard measures to protect your information:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>All data transmitted is encrypted via HTTPS (TLS).</li>
                <li>Payment data is handled exclusively by Stripe using PCI-DSS compliant infrastructure.</li>
                <li>Database access is restricted by role-based access controls.</li>
                <li>Sensitive credentials are stored as encrypted environment variables.</li>
              </ul>
              <p>While we take every reasonable precaution, no method of transmission over the internet is 100% secure.</p>
            </div>
          </div>

          {/* 8 */}
          <div id="cookies" className="scroll-mt-24">
            <SectionHeading num={8}>Cookies &amp; Analytics</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>Our website uses a small number of cookies and local storage entries:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong className="text-white/70">Language preference</strong> — stores your selected language.</li>
                <li><strong className="text-white/70">Session cookie</strong> — if you access the admin panel, a secure session token is stored by Supabase Auth.</li>
                <li><strong className="text-white/70">Google Analytics</strong> — we use Google Analytics to understand how visitors use our website. You can opt out using the Google Analytics Opt-out Browser Add-on.</li>
              </ul>
              <p><strong className="text-white/70">Do Not Track (DNT):</strong> We respect browser Do Not Track signals.</p>
            </div>
          </div>

          {/* 9 */}
          <div id="your-choices" className="scroll-mt-24">
            <SectionHeading num={9}>Your Privacy Choices</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong className="text-white/70">Newsletter opt-out:</strong> Every newsletter includes an unsubscribe link.</li>
                <li><strong className="text-white/70">Cookies:</strong> You can disable cookies through your browser settings.</li>
                <li><strong className="text-white/70">Do Not Track:</strong> Enable the DNT setting in your browser.</li>
                <li><strong className="text-white/70">Data access or deletion:</strong> You may request a copy of your personal data or ask for its deletion at any time (subject to legal retention obligations).</li>
              </ul>
            </div>
          </div>

          {/* 10 */}
          <div id="your-rights" className="scroll-mt-24">
            <SectionHeading num={10}>Your Rights</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>Depending on your location, you may have the following rights:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong className="text-white/70">Access:</strong> Request a copy of the personal data we hold about you.</li>
                <li><strong className="text-white/70">Correction:</strong> Ask us to correct inaccurate or incomplete data.</li>
                <li><strong className="text-white/70">Deletion:</strong> Request deletion of your personal data.</li>
                <li><strong className="text-white/70">Portability:</strong> Receive your data in a structured, machine-readable format.</li>
                <li><strong className="text-white/70">Objection:</strong> Object to certain types of processing.</li>
              </ul>
              <p>To exercise any of these rights, contact us at <a href="mailto:info@epuredrive.com" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">info@epuredrive.com</a>. We will respond within 30 days.</p>
            </div>
          </div>

          {/* 11 */}
          <div id="international" className="scroll-mt-24">
            <SectionHeading num={11}>International Users &amp; Data Transfers</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>éPure Drive is based in Aventura, Florida, United States. When you use our services from outside the US, your personal information is transferred to and processed in the United States.</p>
              <p>Data protection laws in the United States may differ from those in your home country. By using our services, you acknowledge and consent to this transfer.</p>
            </div>
          </div>

          {/* 12 */}
          <div id="external-links" className="scroll-mt-24">
            <SectionHeading num={12}>External Links</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>Our website may contain links to third-party websites. We have no control over the content or privacy practices of those sites and are not responsible for their privacy policies.</p>
            </div>
          </div>

          {/* 13 */}
          <div id="children" className="scroll-mt-24">
            <SectionHeading num={13}>Children&apos;s Privacy</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>Our services are intended for adults only. We do not knowingly collect personal information from anyone under the age of 21. If you believe we have inadvertently collected such information, please contact us immediately.</p>
            </div>
          </div>

          {/* 14 */}
          <div id="changes" className="scroll-mt-24">
            <SectionHeading num={14}>Changes to This Policy</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>We may update this Privacy Policy from time to time. When we make material changes, we will update the &ldquo;Last updated&rdquo; date at the top of this page.</p>
              <p>Continued use of our services after any changes constitutes your acceptance of the updated policy.</p>
            </div>
          </div>

          {/* 15 */}
          <div id="contact" className="scroll-mt-24">
            <SectionHeading num={15}>Contact Us</SectionHeading>
            <div className="text-sm text-white/50 leading-relaxed space-y-3">
              <p>For any questions, concerns, or data requests regarding this Privacy Policy:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong className="text-white/70">Business:</strong> éPure Drive / Route 305 Rental Car</li>
                <li><strong className="text-white/70">Address:</strong> 19707 Turnberry Way, Aventura, FL 33180</li>
                <li><strong className="text-white/70">Phone:</strong> +1 (561) 546-1461</li>
                <li><strong className="text-white/70">Email:</strong> <a href="mailto:info@epuredrive.com" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">info@epuredrive.com</a></li>
              </ul>
              <p className="mt-4">
                See also our <Link href="/terms" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">Terms &amp; Conditions</Link>.
              </p>
            </div>
          </div>

          {/* Last updated */}
          <div className="pt-8 border-t border-white/[0.06]">
            <p className="text-xs text-white/20">
              Last updated: March 2026 · éPure Drive / Route 305 Rental Car · Aventura, Florida
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
