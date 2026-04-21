import type { Metadata } from 'next'
import { Outfit, Manrope } from 'next/font/google'
import CookieConsentBanner from '@/components/CookieConsentBanner'
import CookieConsentManager from '@/components/CookieConsentManager'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import './globals.css'

const outfit = Outfit({ subsets: ['latin'], weight: ['300', '400', '600', '700', '800'], variable: '--font-outfit' })
const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-manrope' })

export const metadata: Metadata = {
  title: {
    default: 'éPure Drive — Premium Fleet Software for Car Rental Businesses',
    template: '%s | éPure Drive',
  },
  description: 'Get your own branded fleet page in minutes. Built for car rental operators in Miami.',
  metadataBase: new URL('https://epuredrive.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://epuredrive.com',
    siteName: 'éPure Drive',
    title: 'éPure Drive — Premium Fleet Software for Car Rental Businesses',
    description: 'A Miami-based SaaS platform built for the modern car rental industry. Streamline operations, elevate the customer journey.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'éPure Drive — Fleet Management Software for Car Rental Businesses',
    description: 'Manage your fleet, accept online bookings, and launch a branded rental site — all from one dashboard. Free to start. Built for independent car rental operators.',
    images: ['https://epuredrive.com/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta property="og:image" content="https://epuredrive.com/og-image.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="éPure Drive — Premium Fleet Software" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="fb:app_id" content="1889073585117703" />
      </head>
      <body className={`${outfit.variable} ${manrope.variable} ${outfit.className}`}>
        <GoogleAnalytics />
        <CookieConsentManager />
        <CookieConsentBanner />
        {children}
      </body>
    </html>
  )
}
