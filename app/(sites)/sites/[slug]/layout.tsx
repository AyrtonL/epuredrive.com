// app/sites/[slug]/layout.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Tenant } from '@/lib/supabase/types'
import type { Metadata } from 'next'
import '@/app/globals.css'
import { Inter, Outfit } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })

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
    .select('id, name, slug, logo_url, brand_name, primary_color, accent_color')
    .eq('slug', params.slug)
    .single()

  if (!tenant) notFound()

  const displayName = (tenant as Tenant).brand_name || (tenant as Tenant).name

  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} scroll-smooth`}>
      <body className="bg-[#040404] text-white min-h-screen font-sans selection:bg-primary/30">
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
              <div className="flex flex-col -space-y-1">
                <span className="font-outfit font-black text-lg tracking-tight group-hover/logo:text-glow transition-all duration-500">{displayName}</span>
                <span className="text-[10px] font-black uppercase tracking-[.3em] text-white/20">Elite Performance</span>
              </div>
            </div>
            
            <div className="flex items-center gap-8">
              <div className="hidden md:flex items-center gap-6">
                {['Cars', 'Experience', 'Concierge'].map((item) => (
                  <a key={item} href={`#${item.toLowerCase()}`} className="text-[10px] font-black uppercase tracking-[.2em] text-white/30 hover:text-white transition-colors">{item}</a>
                ))}
              </div>
              <a
                href="#cars"
                className="bg-white text-black font-black uppercase tracking-widest text-[10px] px-8 py-3.5 rounded-full hover:bg-primary hover:text-white hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5"
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
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height);
            document.getElementById('scroll-progress').style.transform = 'scaleX(' + scrolled + ')';
          });
        `}} />
      </body>
    </html>
  )
}
