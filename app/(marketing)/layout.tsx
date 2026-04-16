// app/(marketing)/layout.tsx
import Logo from '@/components/Logo'
import MarketingFooter from '@/components/MarketingFooter'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />

          <div className="flex items-center gap-6">
            <a
              href="/features"
              className="text-sm text-charcoal hover:text-white transition-colors hidden sm:block"
            >
              Features
            </a>
            <a
              href="/#product"
              className="text-sm text-charcoal hover:text-white transition-colors hidden sm:block"
            >
              Product
            </a>
            <a
              href="/#pricing"
              className="text-sm text-charcoal hover:text-white transition-colors hidden sm:block"
            >
              Pricing
            </a>
            <a
              href="/login"
              className="text-sm text-grey hover:text-white transition-colors"
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
      <MarketingFooter />
    </>
  )
}
