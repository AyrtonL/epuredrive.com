import Link from 'next/link'
import Logo from './Logo'

export default function MarketingFooter() {
  return (
    <footer className="bg-black border-t border-white/[0.06] pt-16 pb-10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-16">
          {/* Brand column */}
          <div className="md:col-span-2">
            <Logo href={undefined} className="mb-4" />
            <p className="text-white/30 text-sm font-light leading-relaxed max-w-sm">
              A Miami-based SaaS platform built for the modern car rental
              industry. Smart technology, premium fleet experience.
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-5">
              Product
            </h4>
            <ul className="space-y-3">
              <li>
                <a href="/#features" className="text-sm text-white/35 hover:text-white transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="/#pricing" className="text-sm text-white/35 hover:text-white transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <Link href="/sign-up" className="text-sm text-white/35 hover:text-white transition-colors">
                  Get started
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-sm text-white/35 hover:text-white transition-colors">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-sm text-white/35 hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-5">
              Legal
            </h4>
            <ul className="space-y-3">
              <li>
                <Link href="/terms" className="text-sm text-white/35 hover:text-white transition-colors">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-white/35 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-5">
              Contact
            </h4>
            <ul className="space-y-3 text-sm text-white/35 font-light">
              <li>
                <a href="mailto:info@epuredrive.com" className="hover:text-white transition-colors">
                  info@epuredrive.com
                </a>
              </li>
              <li>Miami, Florida</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="section-divider mb-8" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/20 text-xs">
            &copy; {new Date().getFullYear()} éPure Drive. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="text-white/20 text-xs hover:text-white/40 transition-colors">
              Terms &amp; Conditions
            </Link>
            <Link href="/privacy" className="text-white/20 text-xs hover:text-white/40 transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
