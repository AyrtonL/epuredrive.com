// app/sites/[slug]/layout.tsx
import type React from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Tenant } from '@/lib/supabase/types'
import type { Metadata } from 'next'
import CookieConsent from '@/components/sites/CookieConsent'

interface Props {
  children: React.ReactNode
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, brand_name')
    .eq('slug', params.slug)
    .single()

  const displayName = tenant?.brand_name || tenant?.name || 'Fleet'
  return {
    title: `${displayName} — Fleet`,
    description: `Browse available vehicles from ${displayName}.`,
  }
}

export default async function TenantLayout({ children, params }: Props) {
  const supabase = createClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug, logo_url, brand_name, primary_color, accent_color, plan, tagline')
    .eq('slug', params.slug)
    .single()

  if (!tenant) notFound()

  const typedTenant = tenant as Tenant
  const displayName = typedTenant.brand_name || typedTenant.name
  const tagline = typedTenant.tagline || 'Premium Fleet'

  const primaryColor = typedTenant.primary_color || '#ffffff'
  const accentColor = typedTenant.accent_color || '#f0f0f0'

  return (
    <div
      className="bg-[#040404] text-white min-h-screen font-sans selection:bg-primary/30 scroll-smooth"
      style={{ '--color-primary': primaryColor, '--color-accent': accentColor } as React.CSSProperties}
    >
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-primary z-[110] origin-left scale-x-0 transition-transform duration-300" id="scroll-progress" />

      <nav className="fixed top-0 inset-x-0 z-[100] h-20 transition-all duration-500 hover:h-24 group">
          <div className="absolute inset-0 bg-[#040404]/40 backdrop-blur-3xl border-b border-white/5" />
          <div className="relative max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
            <div className="flex items-center gap-4 group/logo cursor-pointer">
              <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover/logo:border-primary/50 transition-all duration-500">
                {(tenant as Tenant).logo_url ? (
                  <img src={(tenant as Tenant).logo_url!} alt={displayName} className="w-6 h-6 object-contain" />
                ) : (
                  <span className="font-outfit font-black text-xl text-primary tracking-tighter">É</span>
                )}
              </div>
              <a href="/" className="flex flex-col -space-y-1">
                <span className="font-outfit font-black text-lg tracking-tight group-hover/logo:text-glow transition-all duration-500">{displayName}</span>
                <span className="text-[10px] font-black uppercase tracking-[.3em] text-white/20">{tagline}</span>
              </a>
            </div>

            <div className="flex items-center gap-8">
              <div className="hidden md:flex items-center gap-6">
                <a href="/fleet" className="text-[10px] font-black uppercase tracking-[.2em] text-white/30 hover:text-white transition-colors">Fleet</a>
                <a href="/#experience" className="text-[10px] font-black uppercase tracking-[.2em] text-white/30 hover:text-white transition-colors">Experience</a>
                <a href="/#concierge" className="text-[10px] font-black uppercase tracking-[.2em] text-white/30 hover:text-white transition-colors">Concierge</a>
                <a href="/my-booking" className="text-[10px] font-black uppercase tracking-[.2em] text-white/30 hover:text-white transition-colors">My Booking</a>
              </div>
              <a
                href="/fleet"
                className="bg-white text-black font-black uppercase tracking-widest text-[10px] px-8 py-3.5 rounded-full hover:bg-black hover:text-white hover:border hover:border-white/20 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5"
              >
                Reserve Now
              </a>
            </div>
          </div>
        </nav>
        <main className="pt-20">
          {children}
        </main>

        <script dangerouslySetInnerHTML={{ __html: `
          window.addEventListener('scroll', () => {
            var winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            var height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            var scrolled = (winScroll / height);
            var el = document.getElementById('scroll-progress');
            if (el) el.style.transform = 'scaleX(' + scrolled + ')';
          });
        `}} />

        <CookieConsent />

        {/* Powered by badge — hidden for Max/Enterprise (white-label) */}
        {!['max', 'enterprise'].includes((tenant as Tenant & { plan?: string }).plan ?? '') && (
          <div className="fixed bottom-4 right-4 z-50">
            <a
              href="https://epuredrive.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-black/80 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white/70 hover:border-white/20 transition-all shadow-lg"
            >
              Powered by
              <span className="text-white font-black italic">éPure</span>
            </a>
          </div>
        )}
    </div>
  )
}
