// app/_sites/[slug]/layout.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Tenant } from '@/lib/supabase/types'
import type { Metadata } from 'next'

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
    <html lang="en">
      <body className="bg-[#0a0a0a] text-white min-h-screen">
        <nav className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur border-b border-white/10">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {(tenant as Tenant).logo_url ? (
                <img src={(tenant as Tenant).logo_url!} alt={displayName} className="h-8 object-contain" />
              ) : (
                <span className="font-bold text-lg text-white">{displayName}</span>
              )}
            </div>
            <a
              href="#cars"
              className="text-sm bg-white text-black font-semibold px-4 py-2 rounded-lg hover:bg-white/90 transition-colors"
            >
              View Fleet
            </a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
