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
        <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/90 backdrop-blur border-b border-white/10">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <img src="/assets/logo.png" alt="éPure Drive" className="h-8" />
            </a>
            <div className="flex items-center gap-4">
              <a href="/login" className="text-sm text-white/70 hover:text-white transition-colors">
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
