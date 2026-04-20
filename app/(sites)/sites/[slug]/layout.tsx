// app/sites/[slug]/layout.tsx
import type React from 'react'
import Image from 'next/image'
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
    .select('id, name, slug, logo_url, brand_name, primary_color, accent_color, plan, tagline, site_theme')
    .eq('slug', params.slug)
    .single()

  if (!tenant) notFound()

  const typedTenant = tenant as Tenant
  const displayName = typedTenant.brand_name || typedTenant.name
  const tagline = typedTenant.tagline || 'Premium Fleet'
  const theme = typedTenant.site_theme || 'dark'
  const isLight = theme === 'light'

  // Detect if a hex color is too light (luminance > 0.7) to be visible on white backgrounds
  function isColorTooLight(hex: string): boolean {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b
    return luminance > 0.7
  }

  // For light theme: if primary is too light, swap primary ↔ accent, or fall back to dark
  let primaryColor = typedTenant.primary_color || (isLight ? '#111111' : '#ffffff')
  let accentColor = typedTenant.accent_color || (isLight ? '#3B82F6' : '#f0f0f0')

  if (isLight && primaryColor && isColorTooLight(primaryColor)) {
    // If accent is dark enough, swap them; otherwise use a safe dark fallback
    if (accentColor && !isColorTooLight(accentColor)) {
      primaryColor = accentColor
      accentColor = typedTenant.primary_color || '#f0f0f0'
    } else {
      primaryColor = '#111111'
    }
  }

  return (
    <div
      className={`min-h-screen font-sans selection:bg-primary/30 scroll-smooth ${
        isLight
          ? 'bg-[#FAFAFA] text-gray-900'
          : 'bg-[#040404] text-white'
      }`}
      style={{ '--color-primary': primaryColor, '--color-accent': accentColor } as React.CSSProperties}
      data-theme={theme}
    >
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-primary z-[110] origin-left scale-x-0 transition-transform duration-300" id="scroll-progress" />

      <nav className="fixed top-0 inset-x-0 z-[100] h-20 transition-all duration-500 hover:h-24 group">
          <div className={`absolute inset-0 backdrop-blur-3xl border-b ${
            isLight
              ? 'bg-white/80 border-gray-200/60'
              : 'bg-[#040404]/40 border-white/5'
          }`} />
          <div className="relative max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
            <div className="flex items-center gap-4 group/logo cursor-pointer">
              <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center group-hover/logo:border-primary/50 transition-all duration-500 ${
                isLight
                  ? 'bg-gray-100 border-gray-200'
                  : 'bg-white/5 border-white/10'
              }`}>
                {(tenant as Tenant).logo_url ? (
                  <Image src={(tenant as Tenant).logo_url!} alt={displayName} width={24} height={24} className="w-6 h-6 object-contain" />
                ) : (
                  <span className="font-outfit font-black text-xl text-primary tracking-tighter">É</span>
                )}
              </div>
              <a href={`/sites/${typedTenant.slug}`} className="flex flex-col -space-y-1">
                <span className="font-outfit font-black text-lg tracking-tight group-hover/logo:text-glow transition-all duration-500">{displayName}</span>
                <span className={`text-[10px] font-black uppercase tracking-[.3em] ${isLight ? 'text-gray-400' : 'text-white/20'}`}>{tagline}</span>
              </a>
            </div>

            <div className="flex items-center gap-8">
              <div className="hidden md:flex items-center gap-6">
                <a href={`/sites/${typedTenant.slug}`} className={`text-[10px] font-black uppercase tracking-[.2em] transition-colors ${isLight ? 'text-gray-500 hover:text-gray-900' : 'text-white/70 hover:text-white'}`}>Fleet</a>
                <a href={`/sites/${typedTenant.slug}#experience`} className={`text-[10px] font-black uppercase tracking-[.2em] transition-colors ${isLight ? 'text-gray-500 hover:text-gray-900' : 'text-white/70 hover:text-white'}`}>Experience</a>
                <a href={`/sites/${typedTenant.slug}#concierge`} className={`text-[10px] font-black uppercase tracking-[.2em] transition-colors ${isLight ? 'text-gray-500 hover:text-gray-900' : 'text-white/70 hover:text-white'}`}>Concierge</a>
                <a href={`/sites/${typedTenant.slug}/my-booking`} className={`text-[10px] font-black uppercase tracking-[.2em] transition-colors ${isLight ? 'text-gray-500 hover:text-gray-900' : 'text-white/70 hover:text-white'}`}>My Booking</a>
              </div>
              <a
                href={`/sites/${typedTenant.slug}`}
                className={`font-black uppercase tracking-widest text-[10px] px-8 py-3.5 rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl ${
                  isLight
                    ? 'bg-gray-900 text-white hover:bg-gray-700 shadow-gray-900/10'
                    : 'bg-white text-black hover:bg-black hover:text-white hover:border hover:border-white/20 shadow-white/5'
                }`}
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
              className={`flex items-center gap-2 backdrop-blur-xl border px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg ${
                isLight
                  ? 'bg-white/80 border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'
                  : 'bg-black/80 border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
              }`}
            >
              Powered by
              <span className={`font-black italic ${isLight ? 'text-gray-900' : 'text-white'}`}>éPure</span>
            </a>
          </div>
        )}
    </div>
  )
}
