// app/(marketing)/layout.tsx
import Logo from '@/components/Logo'
import MarketingFooter from '@/components/MarketingFooter'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="sticky top-0 z-50 bg-black/65 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto px-8 flex items-center justify-between py-[18px]">
          <Logo />

          <div className="hidden md:flex items-center gap-9">
            <a href="/#platform" className="text-[13px] text-white/50 hover:text-white transition-colors">Platform</a>
            <a href="/#pricing" className="text-[13px] text-white/50 hover:text-white transition-colors">Pricing</a>
            <a href="/#compare" className="text-[13px] text-white/50 hover:text-white transition-colors">Compare</a>
            <a href="/faq" className="text-[13px] text-white/50 hover:text-white transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <a href="/login" className="text-[13px] text-white/50 hover:text-white transition-colors">Sign in</a>
            <a href="/sign-up" className="inline-flex items-center px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:-translate-y-px transition-all">
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
