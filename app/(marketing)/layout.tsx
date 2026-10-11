// app/(marketing)/layout.tsx
import Logo from '@/components/Logo'
import MarketingFooter from '@/components/MarketingFooter'
import { headers } from 'next/headers'

const NAV = {
  en: { features: ['/features', 'Features'], tour: ['/#tour', 'Tour'], pricing: ['/pricing', 'Pricing'], signIn: 'Sign in', start: 'Get started', switch: ['/es', 'Español'] },
  es: { features: ['/es/features', 'Funciones'], tour: ['/es#tour', 'Tour'], pricing: ['/pricing', 'Precios'], signIn: 'Ingresar', start: 'Empezar', switch: ['/?lang=en', 'English'] },
} as const

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  // Middleware forwards the path; the root layout already reads it for <html lang>.
  const pathname = headers().get('x-pathname') ?? '/'
  const lang = pathname === '/es' || pathname.startsWith('/es/') ? 'es' : 'en'
  const t = NAV[lang]
  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />

          <div className="flex items-center gap-6">
            <a
              href={t.features[0]}
              className="text-sm text-charcoal hover:text-white transition-colors hidden sm:block"
            >
              {t.features[1]}
            </a>
            <a
              href={t.tour[0]}
              className="text-sm text-charcoal hover:text-white transition-colors hidden sm:block"
            >
              {t.tour[1]}
            </a>
            <a
              href={t.pricing[0]}
              className="text-sm text-charcoal hover:text-white transition-colors hidden sm:block"
            >
              {t.pricing[1]}
            </a>
            <a
              href={t.switch[0]}
              hrefLang={lang === 'es' ? 'en' : 'es'}
              className="text-sm text-charcoal hover:text-white transition-colors hidden md:block"
            >
              {t.switch[1]}
            </a>
            <a
              href="/login"
              className="text-sm text-grey hover:text-white transition-colors"
            >
              {t.signIn}
            </a>
            <a
              href="/sign-up"
              className="text-sm bg-white text-black font-semibold px-5 py-2 rounded-lg hover:bg-white/90 transition-colors"
            >
              {t.start}
            </a>
          </div>
        </div>
      </nav>
      <main>{children}</main>
      <MarketingFooter />
    </>
  )
}
