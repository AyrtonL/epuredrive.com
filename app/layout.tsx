import type { Metadata } from 'next'
import { Outfit, Manrope } from 'next/font/google'
import { headers } from 'next/headers'
import CookieConsentBanner from '@/components/CookieConsentBanner'
import CookieConsentManager from '@/components/CookieConsentManager'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import { isTenantHostRequest } from '@/lib/utils/site-base'
import './globals.css'

const outfit = Outfit({ subsets: ['latin'], weight: ['300', '400', '600', '700', '800'], variable: '--font-outfit' })
const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-manrope' })

const OG_TITLE = 'Rental Car Software — Booking Site in Minutes | éPure Drive'
const OG_DESCRIPTION = 'Fleet management software for car rental operators: a branded booking site, online payments and one dashboard. Free forever plan, no credit card.'
const OG_IMAGE = 'https://epuredrive.com/og-image.jpg'

export const metadata: Metadata = {
  title: {
    default: OG_TITLE,
    template: '%s | éPure Drive',
  },
  description: OG_DESCRIPTION,
  metadataBase: new URL('https://epuredrive.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://epuredrive.com',
    siteName: 'éPure Drive',
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'éPure Drive — Fleet Management Software',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [OG_IMAGE],
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
  const pathname = headers().get('x-pathname') ?? '/'
  const lang = pathname === '/es' || pathname.startsWith('/es/') ? 'es' : 'en'
  // Tenant booking sites render their own compact consent bar (same storage
  // key) — showing both stacked two banners over the booking form.
  const isTenantSite = isTenantHostRequest() || pathname.startsWith('/sites/')

  return (
    <html lang={lang}>
      <head>
        <meta property="fb:app_id" content="1889073585117703" />
      </head>
      <body className={`${outfit.variable} ${manrope.variable} ${outfit.className}`}>
        <GoogleAnalytics />
        <CookieConsentManager />
        {!isTenantSite && <CookieConsentBanner />}
        {children}
      </body>
    </html>
  )
}
