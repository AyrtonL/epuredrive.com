import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'
export const alt = 'Fleet'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({ params }: { params: { slug: string } }) {
  const supabase = createClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, brand_name, logo_url, tagline, primary_color')
    .eq('slug', params.slug)
    .single()

  const displayName = tenant?.brand_name ?? tenant?.name ?? 'Fleet'
  const tagline = tenant?.tagline ?? 'Premium Car Rental'
  const primaryColor = tenant?.primary_color ?? '#ffffff'

  return new ImageResponse(
    (
      <div
        style={{
          background: '#040404',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Radial glow using tenant's primary color */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(ellipse at 50% 40%, ${primaryColor}15 0%, transparent 60%)`,
          }}
        />

        {/* Top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '15%',
            right: '15%',
            height: 3,
            background: `linear-gradient(to right, transparent, ${primaryColor}, transparent)`,
          }}
        />

        {/* Logo */}
        {tenant?.logo_url && (
          <img
            src={tenant.logo_url}
            alt=""
            width={80}
            height={80}
            style={{ marginBottom: 24, borderRadius: 16, objectFit: 'contain' }}
          />
        )}

        {/* Business name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: 'white',
            letterSpacing: '-2px',
            display: 'flex',
            marginBottom: 12,
            textAlign: 'center',
            maxWidth: '80%',
          }}
        >
          {displayName}
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 24,
            color: 'rgba(255,255,255,0.5)',
            fontWeight: 500,
            textAlign: 'center',
            maxWidth: 600,
          }}
        >
          {tagline}
        </div>

        {/* Bottom badge */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            color: 'rgba(255,255,255,0.25)',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          Powered by epuredrive.com
        </div>
      </div>
    ),
    { ...size }
  )
}
