// app/(marketing)/layout.tsx
import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import '@/app/globals.css'

const outfit = Outfit({ subsets: ['latin'], weight: ['400', '600', '700'] })

export const metadata: Metadata = {
  title: 'éPure Drive Platform — Fleet Pages for Car Rental Businesses',
  description: 'Get your own branded fleet page in minutes. Built for car rental operators.',
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        <nav className="fixed top-0 w-full z-50 bg-black/85 backdrop-blur-xl border-b border-white/[0.07]">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center">
              <img src="/assets/logo.png" alt="éPure Drive" className="h-7" />
            </a>
            <div className="flex items-center gap-6">
              <a href="/#features" className="text-sm text-white/45 hover:text-white transition-colors hidden sm:block">
                Features
              </a>
              <a href="/#pricing" className="text-sm text-white/45 hover:text-white transition-colors hidden sm:block">
                Pricing
              </a>
              <a href="/login" className="text-sm text-white/60 hover:text-white transition-colors">
                Sign in
              </a>
              <a
                href="/sign-up"
                className="text-sm bg-white text-black font-semibold px-4 py-2 rounded-lg hover:bg-white/90 transition-colors"
              >
                Get started
              </a>
            </div>
          </div>
        </nav>
        <main className="pt-16">{children}</main>
      </body>
    </html>
  )
}
