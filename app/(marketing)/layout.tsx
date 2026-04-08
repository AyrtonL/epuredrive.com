// app/(marketing)/layout.tsx
import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import '@/app/globals.css'

const outfit = Outfit({ subsets: ['latin'], weight: ['300', '400', '600', '700', '800'] })

export const metadata: Metadata = {
  title: 'éPure Drive — Premium Fleet Software for Car Rental Businesses',
  description:
    'Get your own branded fleet page in minutes. Built for car rental operators in Miami.',
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-2xl border-b border-white/[0.06]">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            {/* Logo — TODO: replace with actual SVG from designer */}
            <a href="/" className="flex items-center gap-1">
              <span className="text-lg font-bold tracking-[0.12em] text-white uppercase">
                éPure
              </span>
              <span className="text-lg font-light tracking-[0.12em] text-white/40 uppercase">
                Drive
              </span>
            </a>

            <div className="flex items-center gap-6">
              <a
                href="/#features"
                className="text-sm text-white/40 hover:text-white transition-colors hidden sm:block"
              >
                Features
              </a>
              <a
                href="/#pricing"
                className="text-sm text-white/40 hover:text-white transition-colors hidden sm:block"
              >
                Pricing
              </a>
              <a
                href="/login"
                className="text-sm text-white/50 hover:text-white transition-colors"
              >
                Sign in
              </a>
              <a
                href="/sign-up"
                className="text-sm bg-white text-black font-semibold px-5 py-2 rounded-lg hover:bg-white/90 transition-colors"
              >
                Get started
              </a>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  )
}
