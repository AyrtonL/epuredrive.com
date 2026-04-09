import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'

const outfit = Outfit({ subsets: ['latin'], weight: ['300', '400', '600', '700', '800'] })

export const metadata: Metadata = {
  title: 'éPure Drive — Premium Fleet Software for Car Rental Businesses',
  description: 'Get your own branded fleet page in minutes. Built for car rental operators in Miami.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={outfit.className}>{children}</body>
    </html>
  )
}
